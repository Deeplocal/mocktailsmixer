#!/usr/bin/python

import argparse
import logging
import time
import signal
import sys
import json
import serial
import math, random
import click
import os.path
import RPi.GPIO as GPIO
from six.moves import input
from threading import Thread, Event
import threading
from queue import Queue
from . import (assistant_helpers, auth_helpers, audio_helpers, common_settings)
from google.assistant.embedded.v1alpha1 import embedded_assistant_pb2
from google.rpc import code_pb2
from google.cloud import pubsub


ASSISTANT_API_ENDPOINT = 'embeddedassistant.googleapis.com'
END_OF_UTTERANCE = embedded_assistant_pb2.ConverseResponse.END_OF_UTTERANCE
DIALOG_FOLLOW_ON = embedded_assistant_pb2.ConverseResult.DIALOG_FOLLOW_ON
CLOSE_MICROPHONE = embedded_assistant_pb2.ConverseResult.CLOSE_MICROPHONE


# customizations
DRINK_SIZE = 12 # size of the cup to fill in ounces
# recipes below assume:
#   bottle 0 = orange juice
#   bottle 1 = sparkling water
#   bottle 2 = grenadine
#   bottle 3 = lemon soda
#   bottle 4 = lime juice
#   bottle 5 = unused
#   bottle 6 = unused
#   bottle 7 = unused
MENU = {
  'sunset cooler': [
    { 'bottle' : 0, 'proportion': 4 },
    { 'bottle' : 1, 'proportion': 8 },
    { 'bottle' : 2, 'proportion': 1 }
  ],
  'orange blast': [
    { 'bottle' : 0, 'proportion': 4 },
    { 'bottle' : 1, 'proportion': 1 },
    { 'bottle' : 3, 'proportion': 1 }
  ],
  'cherry bomb': [
    { 'bottle' : 3, 'proportion': 8 },
    { 'bottle' : 2, 'proportion': 1 },
    { 'bottle' : 4, 'proportion': 1 }
  ]
}


# contstants
PUBSUB_PROJECT_ID = 'your-google-project-id'
SER_DEVICE = '/dev/ttyACM0' # ensure correct file descriptor for connected arduino
PUSH_TO_TALK = True
PUSH_TO_TALK_PIN = 26
PUMP_SPEED = 0.056356667 # 100 ml / min = 0.056356667 oz / sec
NUM_BOTTLES = 8
PRIME_WHICH = None


def get_pour_time(pour_prop, total_prop):
  return (DRINK_SIZE * (pour_prop / total_prop)) / PUMP_SPEED


def make_drink(drink_name, msg_q):

  print('make_drink()')

  # check that drink exists in menu
  if not drink_name in MENU:
    print('drink "' + drink_name + '" not in menu')
    return

  # get drink recipe
  recipe = MENU[drink_name]
  print(drink_name + ' = ' + str(recipe))

  # sort drink ingredients by proportion
  sorted_recipe = sorted(recipe, key=lambda p: p['proportion'], reverse=True)
  # print(sorted_recipe)

  # calculate time to pour most used ingredient
  total_proportion = 0
  for p in sorted_recipe:
    total_proportion += p['proportion']
  drink_time = get_pour_time(sorted_recipe[0]['proportion'], total_proportion)
  print('Drink will take ' + str(math.floor(drink_time)) + 's')

  # for each pour
  for i, pour in enumerate(sorted_recipe):

    # for first ingredient
    if i == 0:

      # start pouring with no delay
      pour_thread = Thread(target=trigger_pour, args=([msg_q, pour['bottle'], math.floor(drink_time)]))
      pour_thread.start()

    # for other ingredients
    else:

      # calculate the latest time they could start
      pour_time = get_pour_time(pour['proportion'], total_proportion)
      latest_time = drink_time - pour_time

      # start each other ingredient at a random time between now and latest time
      delay = random.randint(0, math.floor(latest_time))
      pour_thread = Thread(target=trigger_pour, args=([msg_q, pour['bottle'], math.floor(pour_time), delay]))
      pour_thread.start()


def trigger_pour(msg_q, bottle_num, pour_time, start_delay=0):

  if bottle_num > NUM_BOTTLES:
    print('Bad bottle number')
    return

  print('Pouring bottle ' + str(bottle_num) + ' for ' + str(pour_time) + 's after a ' + str(start_delay) + 's delay')

  time.sleep(start_delay) # start delay
  msg_q.put('b' + str(bottle_num) + 'r!') # start bottle pour
  time.sleep(pour_time) # wait
  msg_q.put('b' + str(bottle_num) + 'l!') # end bottle pour


def signal_handler(signal, frame):
    """ Ctrl+C handler to cleanup """

    if PUSH_TO_TALK:
      GPIO.cleanup()

    for t in threading.enumerate():
      # print(t.name)
      if t.name != 'MainThread':
        t.shutdown_flag.set()

    print('Goodbye!')
    sys.exit(1)


def poll(assistant_thread):
  """ Polling function for push-to-talk button """

  is_active = False
  # vals = [1, 1, 1]
  vals = [0, 0, 0]

  while True:

    # get input value
    val = GPIO.input(PUSH_TO_TALK_PIN)
    # print("input = ", in_val)

    # shift values
    vals[2] = vals[1]
    vals[1] = vals[0]
    vals[0] = val

    # check for button press and hold
    # if (is_active == False) and (vals[2] == 1) and (vals[1] == 0) and (vals[0] == 0):
    if (is_active == False) and (vals[2] == 0) and (vals[1] == 1) and (vals[0] == 1):
      is_active = True
      assistant_thread.button_flag.set()
      print('Start talking')

    # check for button release
    # if (is_active == True) and (vals[2] == 0) and (vals[1] == 1) and (vals[0] == 1):
    if (is_active == True) and (vals[2] == 1) and (vals[1] == 0) and (vals[0] == 0):
      is_active = False

    # sleep
    time.sleep(0.1)


def setup_assistant():

    # Load credentials.
    try:
      credentials = os.path.join(
          click.get_app_dir(common_settings.ASSISTANT_APP_NAME),
          common_settings.ASSISTANT_CREDENTIALS_FILENAME
      )
      global creds
      creds = auth_helpers.load_credentials(credentials, scopes=[common_settings.ASSISTANT_OAUTH_SCOPE, common_settings.PUBSUB_OAUTH_SCOPE])
    except Exception as e:
      logging.error('Error loading credentials: %s', e)
      logging.error('Run auth_helpers to initialize new OAuth2 credentials.')
      return -1

    # Create gRPC channel
    grpc_channel = auth_helpers.create_grpc_channel(ASSISTANT_API_ENDPOINT, creds)
    logging.info('Connecting to %s', ASSISTANT_API_ENDPOINT)

    # Create Google Assistant API gRPC client.
    global assistant
    assistant = embedded_assistant_pb2.EmbeddedAssistantStub(grpc_channel)
    return 0


class AssistantThread(Thread):

  def __init__(self, msg_queue):
    Thread.__init__(self)
    self.shutdown_flag = Event()
    self.button_flag = Event()
    self.msg_queue = msg_queue

  def run(self):

    # Configure audio source and sink.
    audio_device = None
    audio_source = audio_device = (
        audio_device or audio_helpers.SoundDeviceStream(
            sample_rate=common_settings.DEFAULT_AUDIO_SAMPLE_RATE,
            sample_width=common_settings.DEFAULT_AUDIO_SAMPLE_WIDTH,
            block_size=common_settings.DEFAULT_AUDIO_DEVICE_BLOCK_SIZE,
            flush_size=common_settings.DEFAULT_AUDIO_DEVICE_FLUSH_SIZE
        )
    )
    audio_sink = audio_device = (
        audio_device or audio_helpers.SoundDeviceStream(
            sample_rate=common_settings.DEFAULT_AUDIO_SAMPLE_RATE,
            sample_width=common_settings.DEFAULT_AUDIO_SAMPLE_WIDTH,
            block_size=common_settings.DEFAULT_AUDIO_DEVICE_BLOCK_SIZE,
            flush_size=common_settings.DEFAULT_AUDIO_DEVICE_FLUSH_SIZE
        )
    )

    # Create conversation stream with the given audio source and sink.
    conversation_stream = audio_helpers.ConversationStream(
        source=audio_source,
        sink=audio_sink,
        iter_size=common_settings.DEFAULT_AUDIO_ITER_SIZE,
    )

    # Stores an opaque blob provided in ConverseResponse that,
    # when provided in a follow-up ConverseRequest,
    # gives the Assistant a context marker within the current state
    # of the multi-Converse()-RPC "conversation".
    # This value, along with MicrophoneMode, supports a more natural
    # "conversation" with the Assistant.
    conversation_state_bytes = None

    # Stores the current volument percentage.
    # Note: No volume change is currently implemented
    volume_percentage = 50

    # Keep the microphone open for follow on requests
    follow_on = False

    while not self.shutdown_flag.is_set():

      # conversation ux lights off
      self.msg_queue.put('xo!')

      # get manual input start
      if not follow_on:

        if PUSH_TO_TALK:
          while not self.button_flag.is_set():
            time.sleep(0.1)
          self.button_flag.clear()
        else :
          print('Press Enter to send a new request.')
          input()

        # conversation ux lights hotword
        self.msg_queue.put('xh!')

      else:

        # listening ux lights hotword
        self.msg_queue.put('xl!')

      conversation_stream.start_recording()
      logging.info('Recording audio request.')

      # This generator yields ConverseRequest to send to the gRPC Google Assistant API.
      converse_requests = assistant_helpers.gen_converse_requests(
          conversation_stream,
          sample_rate=common_settings.DEFAULT_AUDIO_SAMPLE_RATE,
          conversation_state=conversation_state_bytes,
          volume_percentage=volume_percentage
      )

      def iter_converse_requests():
        for c in converse_requests:
          assistant_helpers.log_converse_request_without_audio(c)
          yield c
        conversation_stream.start_playback()

      # This generator yields ConverseResponse proto messages received from the gRPC Google Assistant API.
      for resp in assistant.Converse(iter_converse_requests(), common_settings.DEFAULT_GRPC_DEADLINE):

        assistant_helpers.log_converse_response_without_audio(resp)

        if resp.error.code != code_pb2.OK:
          logging.error('server error: %s', resp.error.message)
          break

        if resp.event_type == END_OF_UTTERANCE:
          logging.info('End of audio request detected')
          conversation_stream.stop_recording()
          self.msg_queue.put('xt!') # conversation ux lights thinking

        if resp.result.spoken_request_text:
          logging.info('Transcript of user request: "%s".', resp.result.spoken_request_text)
          logging.info('Playing assistant response.')
          self.msg_queue.put('xr!') # conversation ux lights responding

        if len(resp.audio_out.audio_data) > 0:
          # print('writing audio data')
          conversation_stream.write(resp.audio_out.audio_data)

        if resp.result.conversation_state:
          conversation_state_bytes = resp.result.conversation_state

        if resp.result.volume_percentage != volume_percentage:
          volume_percentage = resp.result.volume_percentage
          logging.info('Volume should be set to %s%%' % volume_percentage)

        # check for follow on
        if resp.result.microphone_mode == DIALOG_FOLLOW_ON:
          follow_on = True
          logging.info('Expecting follow-on query from user.')
        elif resp.result.microphone_mode == CLOSE_MICROPHONE:
          follow_on = False
          logging.info('Not expecting follow-on query from user.')

    conversation_stream.close()


class SubscriptionThread(Thread):

  def __init__(self, msg_queue):

    Thread.__init__(self)

    self.shutdown_flag = Event()
    self.msg_queue = msg_queue;

    # Create a new pull subscription on the given topic
    pubsub_client = pubsub.Client(project=PUBSUB_PROJECT_ID, credentials=creds)
    topic_name = 'MocktailsMixerMessages'
    topic = pubsub_client.topic(topic_name)

    subscription_name = 'PythonMocktailsMixerSub'
    self.subscription = topic.subscription(subscription_name)
    try:
      self.subscription.create()
      logging.info('Subscription created')
    except Exception as e:
      print(e)
      logging.info('Subscription already exists')

  def run(self):
    """ Poll for new messages from the pull subscription """

    while True:

      # pull messages
      results = self.subscription.pull(return_immediately=True)

      for ack_id, message in results:

          # convert bytes to string and slice string
          # http://stackoverflow.com/questions/663171/is-there-a-way-to-substring-a-string-in-python
          json_string = str(message.data)[3:-2]
          json_string = json_string.replace('\\\\', '')
          logging.info(json_string)

          # create dict from json string
          try:
              json_obj = json.loads(json_string)
          except Exception as e:
              logging.error('JSON Error: %s', e)

          # get intent from json
          intent = json_obj['intent']
          print('pub/sub: ' + intent)

          # perform action based on intent
          if intent == 'prime_pump_start':
            PRIME_WHICH = json_obj['which_pump']
            print('Start priming pump ' + PRIME_WHICH)
            self.msg_queue.put('b' + PRIME_WHICH + 'r!') # turn on relay

          elif intent == 'prime_pump_end':
            if PRIME_WHICH != None:
              print('Stop priming pump ' + PRIME_WHICH)
              self.msg_queue.put('b' + PRIME_WHICH + 'l!') # turn off relay
              PRIME_WHICH = None

          elif intent == 'make_drink':
            make_drink(json_obj['drink'], self.msg_queue)

      # ack received message
      if results:
        self.subscription.acknowledge([ack_id for ack_id, message in results])

      time.sleep(0.25)


class SerialThread(Thread):

  def __init__(self, msg_queue):
    Thread.__init__(self)
    self.shutdown_flag = Event()
    self.msg_queue = msg_queue;
    self.serial = serial.Serial(SER_DEVICE, 9600)

  def run(self):

    while not self.shutdown_flag.is_set():

      if not self.msg_queue.empty():
        cmd = self.msg_queue.get()
        self.serial.write(str.encode(cmd))
        print('Serial sending ' + cmd)


if __name__ == '__main__':

  # set log level (DEBUG, INFO, ERROR)
  logging.basicConfig(level=logging.INFO)

  # handle SIGINT gracefully
  signal.signal(signal.SIGINT, signal_handler)

  # setup assistant
  ret_val = setup_assistant()
  if ret_val == 0:

    # create message queue for communicating between threads
    msg_q = Queue()

    # start serial thread
    serial_thread = SerialThread(msg_q)
    serial_thread.start()

    # create pub/sub subscription and start thread
    sub_thread = SubscriptionThread(msg_q)
    sub_thread.start()

    # start assistant thread
    assistant_thread = AssistantThread(msg_q)
    assistant_thread.start()

    # # wait for main to finish until assistant thread is done
    # assisstant_thread.join()

    if PUSH_TO_TALK:

      # setup push to talk and start thread
      GPIO.setmode(GPIO.BOARD)
      GPIO.setup(PUSH_TO_TALK_PIN, GPIO.IN)
      poll_thread = Thread(target=poll, args=([assistant_thread]))
      poll_thread.start()
