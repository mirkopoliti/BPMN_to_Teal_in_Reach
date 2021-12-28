/*
 Line 8 imports the Reach standard library loader.29
 Line 9 imports your backend, which ./reach compile will produce.30
 Line 10 loads the standard library dynamically based on the REACH_CONNECTOR_MODE environment variable.
 Line 11 and 12 need to import JSON
*/

import { loadStdlib } from '@reach-sh/stdlib';
import * as backend from './build/index.main.mjs';
const stdlib = loadStdlib(process.env);
import { readFile } from "fs/promises";
const file = JSON.parse(await readFile('./test.json'));

/* 
statusOperations is a dictionary for the status of the operation. We have only 4 status:
 - Enabled: The operation with this status is Free and it can be call 
 - Pending: The operation with this status needs to be called before the end
 - Urgent: The operation with this status needs to be the next operation called
 - Locked: The operation with this status is locked so it cannot be called
*/

const statusOperations = {

  ENABLED: 0,
  PENDING: 1,
  URGENT: 2,
  LOCKED: 3,

};

// Operation is a dictionary that will contain all the operation found in the JSON with value = ENABLED
let Operations = {};

// Order is an Array that will contain the order in which the operations are called 
let Order = [];

/* 
checkCall is an Array that will contains all the constraint in the JSON with a structure like "init('Login',value)".
we'll use this structure for the automative call.
*/
let checkCall = [];

/*
statusConstraints is a dictionary for the status of contraints. We have 4 stutus:
  - PSATISFIED: permanently satisfied 
  - PVIOLATED: permanently violated
  - TSATISFIED: temporarily satisfied
  - TVIOLATED: temporarily violated
*/
const statusConstraints = {

  PSATISFIED: 0,
  PVIOLATED: 1,
  TSATISFIED: 2,
  TVIOLATED: 3,
};

// contraints is a dictionary that will contaions all the contraints associated with its operations like: 'init§Login': 0, 'respondedExistence§Login§Buy': 0,
let constraints = {};


eachRecursive(file);


/*
eachRecursive is the function that analyze the JSON in input and create Operation, checkCall and constraints variables.
*/
function eachRecursive(obj) {
  for (var k in obj) {
    if (typeof obj[k] == "object" && obj[k] !== null) {
      let stringCheck = "";
      let stringConstrain = "";
      if (obj[k]["parameters"] != null) {

        if (obj[k]["template"] != "response") {
          stringConstrain += obj[k]["template"];
          stringCheck += obj[k]["template"];
          stringCheck += "(";
        }
        else {
          stringConstrain += obj[k]["template"];
          stringConstrain += "T";
          stringCheck += obj[k]["template"];
          stringCheck += "T";
          stringCheck += "(";

        }

        for (var j in obj[k]["parameters"]) {
          stringConstrain += "§";
          Operations[obj[k]["parameters"][j][0]] = statusOperations.ENABLED; //CREA Operations

          stringConstrain += obj[k]["parameters"][j][0];
          stringCheck += "'";
          stringCheck += obj[k]["parameters"][j][0];
          stringCheck += "'";
          stringCheck += ",";

        }
        stringCheck += "value";
        stringCheck += ")";
        checkCall.push(stringCheck);
        constraints[stringConstrain] = 0;

      }

      eachRecursive(obj[k]);
    }
    else
      console.log(" ");
  }

}



/*
 Line 124:  Defines an asynchronous function that will be the body of our frontend.
 Line 126 : Defines a quantity of network tokens as the starting balance for each test account.
 Line 127/128: Create test accounts with initial endowments for Alice and Bob. This will only work on the Reach-provided developer testing network
 Line 129: has Alice deploy the application
*/

(async () => {

  const startingBalance = stdlib.parseCurrency(10);
  const accAlice = await stdlib.newTestAccount(startingBalance);
  const accBob = await stdlib.newTestAccount(startingBalance);
  const ctcAlice = accAlice.deploy(backend);
  const ctcBob = accBob.attach(backend, ctcAlice.getInfo());


  //trimNull is a simple function for delete null value from the strings
  function trimNull(a) {

    var c = a.indexOf('\0');
    if (c > -1) {
      return a.substr(0, c);
    }
    return a;
  }


  let initEnum = {
    0: 'tv',
    1: 'ps',
    2: 'pv',
  }

  //start with 0 = tv, go to 1 = ps if it occurs and go to 2 = pv when called with something other than init

  function init(value, called) {

    if (value == called) {
      constraints["init".concat("§").concat(value)] = 1;
    }
    else if (value != called && constraints["init".concat("§").concat(value)] != 1) {
      constraints["init".concat("§").concat(value)] = 2;
    }
  }

  let endEnum = {
    0: 'tv',
    1: 'tv',
    2: 'ps',
  }


  //starts with 0 = tv and goes to 1 = tv if called, goes to 2 = ps if called immediately after finish, otherwise it returns to 0

  function end(value, called) {
    console.log(value);
    if (value == called) {

      constraints["end".concat("§").concat(value)] = 1;
      Operations[called] = statusOperations.PENDING;
    }
    else if (constraints["end".concat("§").concat(value)] == 1 && called == "TERMINATE") {

      constraints["end".concat("§").concat(value)] = 2;
      Operations[value] = statusOperations.ENABLED;

    }
    else if (constraints["end".concat("§").concat(value)] == 1 && called != "TERMINATE") {
      constraints["end".concat("§").concat(value)] = 0;
    }

  }


  let participationEnum = {
    0: 'tv',
    1: 'ps',

  }
  //starts at 0 = tv and goes to 1 = ps if called

  function participation(value, called) {

    if (value == called) {
      constraints["participation".concat("§").concat(value)] = 1;
      Operations[called] = statusOperations.ENABLED;
    }

  }

  let atMostOneEnum = {
    0: 'tv',
    1: 'ts',
    2: 'pv',
  }

  //starts at 0 = tv goes to 1 = ts, goes to 2 = pv if called
  function atMostOne(value, called) {
    if (value == called) {
      constraints["atMostOne".concat("§").concat(value)] = 1;
      Operations[called] = statusOperations.LOCKED;
    }
    else if (value == called && constraints["atMostOne".concat("§").concat(value)] == 1) {
      constraints["atMostOne".concat("§").concat(value)] = 2;
    }


  }

  let respondedExistenceEnum = {
    0: 'ts',
    1: 'ps',
    2: 'tv',
  }
  // starts at 0 = ts goes to 1 = ps if value enters, otherwise if value 2 enters it goes to 2 = tv and if value enters after then it sets back to 1
  function respondedExistence(value, value2, called) {

    if (value2 == called && constraints["respondedExistence".concat("§").concat(value).concat(value2)] == 0) {

      constraints["respondedExistence".concat("§").concat(value).concat("§").concat(value2)] = 1;
    }
    else if (value == called && constraints["respondedExistence".concat("§").concat(value).concat("§").concat(value2)] == 0) {
      constraints["respondedExistence".concat("§").concat(value).concat("§").concat(value2)] = 2;
      Operations[value2] = statusOperations.PENDING;
    }
    else if (value2 == called && constraints["respondedExistence".concat("§").concat(value).concat("§").concat(value2)] == 2) {
      constraints["respondedExistence".concat("§").concat(value).concat("§").concat(value2)] = 1;
    }

  }


  let chainResponseEnum = {
    0: 'ts',
    1: 'pv',
    2: 'tv',
  }

  //starts from 0 = ts goes to 2 = tv if value enters, from here it returns to 0 if value2 enters otherwise goes to 1: pv
  function chainResponse(value, value2, called) {
    if (value == called && constraints["chainResponse".concat("§").concat(value).concat("§").concat(value2)] == 0) {
      constraints["chainResponse".concat("§").concat(value).concat("§").concat(value2)] = 2
      Operations[value2] = statusOperations.URGENT;
    }
    else if (value2 == called && constraints["chainResponse".concat("§").concat(value).concat("§").concat(value2)] == 2) {

      constraints["chainResponse".concat("§").concat(value).concat("§").concat(value2)] = 0
      Operations[value2] = statusOperations.ENABLED;
    }
    else if (value2 != called && constraints["chainResponse".concat("§").concat(value).concat("§").concat(value2)] == 2) {
      constraints["chainResponse".concat("§").concat(value).concat("§").concat(value2)] = 1
    }

  }


  let responseTEnum = {
    0: 'ts',
    1: 'tv',

  }

  //starts at 0 = ts goes to 1 = ts if value enters
  function responseT(value, value2, called) {
    if (value == called && constraints["responseT".concat("§").concat(value).concat("§").concat(value2)] == 0) {
      constraints["responseT".concat("§").concat(value).concat("§").concat(value2)] = 1;
    }
    else if (value2 == called && constraints["responseT".concat("§").concat(value).concat("§").concat(value2)] == 1) {
      constraints["responseT".concat("§").concat(value).concat("§").concat(value2)] = 0;
    }

  }

  function precedence(value, value2, called) {
    constraints["precedence".concat(value).concat(value2)] = statusConstraints.PSATISFIED;
    if (Operations[value2] == statusOperations.CALLEDANDCALLABLE && Operations[value] != statusOperations.CALLEDANDCALLABLE) {
      console.log("errore devi prima svolgere qualcos'altro");
      Operations[value] = statusOperations.ERROR;

    }
  }
  function chainPrecedence(value, value2, called) {
    console.log(Operations);
    console.log(Order);
    constraints["chainPrecedence".concat(value).concat(value2)] = statusConstraints.PSATISFIED;
    if (Operations[value2] == statusOperations.CALLEDANDCALLABLE && Order[Order.length - 1] != value) {
      Operations[value2] = statusOperations.ERROR;
      console.log("errore in chanPrecedence");
    }
  }

  function alternatePrecedence(value, value2, called) {
    constraints["alternatePrecedence".concat(value).concat(value2)] = statusConstraints.PSATISFIED;
    if (Operations[value2] == statusOperations.CALLEDANDCALLABLE && Order.indexOf(value) == -1 || Order[Order.length - 1] == value2) {
      Operations[value2] = statusOperations.ERROR;
      console.log("errore in alternatePrecedence");
    }
  }

  //look for the presence of errors reported in the dictionary with the value pv
  function findError() {
    for (var prop in constraints) {
      const app = prop.substring(0, prop.indexOf("§"));
      if (eval(app.concat("Enum"))[constraints[prop]] == 'pv') {
        return false;
      }
    }
    return true;
  }

  //looks for errors when the terminate action is sent
  function findErrorTerminate() {
    for (var prop in constraints) {
      const app = prop.substring(0, prop.indexOf("§"));
      if (eval(app.concat("Enum"))[constraints[prop]] == 'pv' || eval(app.concat("Enum"))[constraints[prop]] == 'tv') {
        return false;
      }
    }
    return true;
  }

  //function used for the automative call 
  function check(value) {

    for (var val in checkCall) {
      eval(checkCall[val]);
    }

  }

  /*
  Main function: First call trim Null.
  subsequently it checks the status of the called operation, checking if it is not locked. 
  If it is not, it calls the check function with the value called and checks if the operation called is TERMINATE (ie the last one) 
  and in this case it checks with findError for errors and if it returns it returns that everything is good.
  Otherwise it will throw an error and restore the system state to the previous call.
  If the call is different from Terminate in this case it will update Order.
  */
  const Agency = (Who) => ({

    Main: (value) => {

      value = trimNull(value);

      if (Operations[value] != statusOperations.LOCKED) {
        const OperationsSAFE = { ...Operations };
        const costraintSafe = { ...constraints };
        Operations[value] = statusOperations.ENABLED;
        check(value);
        if (value != "TERMINATE") {
          if (findError() == true) {
            Order.push(value);
            console.log(Operations);
            console.log(constraints);
            console.log(Order);

            return true;
          }
          else {
            Operations = OperationsSAFE;
            constraints = costraintSafe;
            console.log("Action denied");
            return false;
          }
        }
        else {
          if (findErrorTerminate() == true) {
            Order.push(value);
            console.log(Operations);
            console.log(constraints);
            console.log(Order);

            return true;
          }
          else {
            Operations = OperationsSAFE;
            constraints = costraintSafe;
            console.log("Action denied you must perform another operation before finishing");
            return false;
          }
        }

      }

      else {
        console.log("You requested something from Locked");
        return false;
      }

    },

  });

  await Promise.all([
    backend.Alice(ctcAlice, {
      ...Agency('Alice'),

    }),

  ]);

})();
