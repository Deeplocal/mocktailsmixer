# To run: $ env/bin/python googlesamples/bartender/test_serial.py

import serial
from threading import Thread

num_bottles = 2
bottle_on = []
for i in range(0, num_bottles):
  bottle_on.append(False)

ser = serial.Serial('/dev/ttyACM0', 9600)

def write_loop():

  while True:
    serial_str = input('Enter string to send: ')
    ser.write(str.encode(serial_str))
    print('Sent')

# def read_loop():
#   while True:
#     read_serial = ser.readline()
#     print('read: ' + str(read_serial))

# read_thread = Thread(target=read_loop, args=())
# read_thread.start()

# write_thread = Thread(target=write_loop, args=())
# write_thread.start()

write_loop()
