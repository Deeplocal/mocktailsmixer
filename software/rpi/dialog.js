const drinks = [
  { name: 'sunset cooler', ingredients: [] },
  { name: 'orange blast', ingredients: [] },
  { name: 'cherry bomb', ingredients: [] }
];

class DialogComponent {
  constructor() {
    // WTF goes here???
  }
  checkForDrink(txt) {
    console.log('we should check for a drink', txt);
    // How do we check if the txt matches one of our `drinks`?
  }
}

module.exports = { DialogComponent };
