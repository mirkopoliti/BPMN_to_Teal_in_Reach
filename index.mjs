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

const startingBalance = stdlib.parseCurrency(100);
const accAlice = await stdlib.newTestAccount(startingBalance);
const accBob = await stdlib.newTestAccount(startingBalance);

const fmt = (x) => stdlib.formatCurrency(x, 4);
const getBalance = async (who) => fmt(await stdlib.balanceOf(who));
const beforeAlice = await getBalance(accAlice);
const beforeBob = await getBalance(accBob);

const ctcAlice = accAlice.contract(backend);
const ctcBob = accBob.contract(backend, ctcAlice.getInfo());

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
let operations = {};

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

// 4 constants for constraints state in the enum.
const tv = 'tv';
const ts = 'ts';
const pv = 'pv';
const ps = 'ps';

//separetor
const separator = '§';


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
          stringConstrain += separator;
          operations[obj[k]["parameters"][j][0]] = statusOperations.ENABLED;
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

  }

}



/*
 Line 132:  Defines an asynchronous function that will be the body of our frontend.
 Line 134 : Defines a quantity of network tokens as the starting balance for each test account.
 Line 135/136: Create test accounts with initial endowments for Alice and Bob. This will only work on the Reach-provided developer testing network
 Line 137: has Alice deploy the application
*/





//trimNull is a simple function for delete null value from the strings
function trimNull(a) {

  var c = a.indexOf('\0');
  if (c > -1) {
    return a.substr(0, c);
  }
  return a;
}


let initEnum = {
  0: tv,
  1: ps,
  2: pv,
}

//start with 0 = tv, go to 1 = ps if it occurs and go to 2 = pv when called with something other than init

function init(value, called) {

  if (value == called) {
    constraints[concatenation(['init',value])] = 1;
  }
  else if (value != called && constraints[concatenation(['init',value])] != 1) {
    constraints[concatenation(['init',value])] = 2;
  }
}

let endEnum = {
  0: tv,
  1: tv,
  2: ps,
}


//starts with 0 = tv and goes to 1 = tv if called, goes to 2 = ps if called immediately after finish, otherwise it returns to 0

function end(value, called) {
  if (value == called) {

    constraints[concatenation(["end",value])] = 1;
    operations[called] = statusOperations.PENDING;
  }
  else if (constraints[concatenation(["end",value])] == 1 && called == "TERMINATE") {

    constraints[concatenation(["end",value])] = 2;
    operations[value] = statusOperations.ENABLED;

  }
  else if (constraints[concatenation(["end",value])] == 1 && called != "TERMINATE") {
    constraints[concatenation(["end",value])] = 0;
  }

}


let participationEnum = {
  0: tv,
  1: ps,

}
//starts at 0 = tv and goes to 1 = ps if called

function participation(value, called) {
  if (value == called) {
    constraints[concatenation(["participation",value])] = 1;
    operations[called] = statusOperations.ENABLED;
  }

}

let atMostOneEnum = {
  0: tv,
  1: ts,
  2: pv,
}

//starts at 0 = tv goes to 1 = ts, goes to 2 = pv if called
function atMostOne(value, called) {
  if (value == called) {
    constraints[concatenation(["atMostOne",value])] = 1;
    operations[called] = statusOperations.LOCKED;
  }
  else if (value == called && constraints[concatenation(["atMostOne",value])] == 1) {
    constraints[concatenation(["atMostOne",value])] = 2;
  }


}

let respondedExistenceEnum = {
  0: ts,
  1: ps,
  2: tv,
}
// starts at 0 = ts goes to 1 = ps if value enters, otherwise if value 2 enters it goes to 2 = tv and if value enters after then it sets back to 1
function respondedExistence(value, value2, called) {
  if (value2 == called && constraints[concatenation(["respondedExistence",value, value2])] == 0) {

    constraints[concatenation(["respondedExistence",value, value2])] = 1;
  }
  else if (value == called && constraints[concatenation(["respondedExistence",value, value2])] == 0) {
    constraints[concatenation(["respondedExistence",value, value2])] = 2;
    operations[value2] = statusOperations.PENDING;
  }
  else if (value2 == called && constraints[concatenation(["respondedExistence",value, value2])] == 2) {
    constraints[concatenation(["respondedExistence",value, value2])] = 1;
  }

}


let chainResponseEnum = {
  0: ts,
  1: pv,
  2: tv,
}

//starts from 0 = ts goes to 2 = tv if value enters, from here it returns to 0 if value2 enters otherwise goes to 1: pv

function chainResponse(value, value2, called) {
  if (value == called && constraints[concatenation(["chainResponse",value, value2])] == 0) {
    constraints[concatenation(["chainResponse",value, value2])] = 2
    operations[value2] = statusOperations.URGENT;
  }
  else if (value2 == called && constraints[concatenation(["chainResponse",value, value2])] == 2) {

    constraints[concatenation(["chainResponse",value, value2])] = 0
    operations[value2] = statusOperations.ENABLED;
  }
  else if (value2 != called && constraints[concatenation(["chainResponse",value, value2])] == 2) {
    constraints[concatenation(["chainResponse",value, value2])] = 1
  }
}


let responseTEnum = {
  0: ts,
  1: tv,

}

//starts at 0 = ts goes to 1 = ts if value enters
function responseT(value, value2, called) {
  if (value == called && constraints[concatenation(["responseT",value, value2])] == 0) {
    constraints[concatenation(["responseT",value, value2])] = 1;
  }
  else if (value2 == called && constraints[concatenation(["responseT",value, value2])] == 1) {
    constraints[concatenation(["responseT",value, value2])] = 0;
  }

}

let precedenceEnum = {
  0: ts,
  1: ps,
  2: pv,
}

//starts with 0 = ts goes to 1 = ps if value enters else if value2 enters go in 2:pv. 
function precedence(value, value2, called) {

  if (value == called && constraints[concatenation(["precedence",value, value2])] == 0) {
    constraints[concatenation(["precedence",value, value2])] = 1;
  }

  else if (value2 == called && constraints[concatenation(["precedence",value, value2])] == 0) {
    constraints[concatenation(["precedence",value, value2])] = 2;
  }

}

let chainPrecedenceEnum = {
  0: ts,
  1: ts,
  2: pv,
}

//starts with 0 = ts goes to 1 = ts if value enters else if value2 enters go in 2:pv. if is in 1 = ts and a value different "value" enters go in 0 = pv

function chainPrecedence(value, value2, called) {

  if (value == called && constraints[concatenation(["chainPrecedence",value, value2])] == 0) {
    constraints[concatenation(["chainPrecedence",value, value2])] = 1;
  }
  else if (value != called && constraints[concatenation(["chainPrecedence",value, value2])] == 1) {
    constraints[concatenation(["chainPrecedence",value, value2])] = 0;
  }
  else if (value2 == called && constraints[concatenation(["chainPrecedence",value, value2])] == 0) {
    constraints[concatenation(["chainPrecedence",value, value2])] = 2;
  }
}

let alternatePrecedenceEnum = {
  0: ts,
  1: ts,
  2: pv,
}

//starts with 0 = ts goes to 1 = ts if value enters else if value2 enters go in 2:pv. if is in 1 = ts and a value2 enters go in 0 = pv
function alternatePrecedence(value, value2, called) {
  if (value == called && constraints[concatenation(["alternatePrecedence",value, value2])] == 0) {
    constraints[concatenation(["alternatePrecedence",value, value2])] = 1;
  }
  else if (value2 == called && constraints[concatenation(["alternatePrecedence",value, value2])] == 1) {
    constraints[concatenation(["alternatePrecedence",value, value2])] = 0;
  }
  else if (value2 == called && constraints[concatenation(["alternatePrecedence",value, value2])] == 0) {
    constraints[concatenation(["alternatePrecedence",value, value2])] = 2;
  }
}

let existenceEnum = {
  0: tv,
  1: ps,
}
//start with 0 = tv, goes to 1 = ps if value enters.
function existence(value, called){
  if (value == called && constraints[concatenation(["existence",value])] == 0) {
    constraints[concatenation(["existence",value])] = 1;
  }
  else {
    operations[called] = statusOperations.PENDING;
  }
}

let alternateResponseEnum = {
  0: ts,
  1: pv,
  2: tv,
}

//starts with 0 = ts goes to 2 = tv if value enters. if is in 2 = tv and a value enters go in 1 = tv else return in 0 = ts
function alternateResponse(value, value2, called) {
  if (value == called && constraints[concatenation(["alternateResponse",value, value2])] == 0) {
    constraints[concatenation(["alternateResponse",value, value2])] = 2;
    operations[called] = statusOperations.LOCKED;
  }
  else if (value == called && constraints[concatenation(["alternateResponse",value, value2])] == 2) {
    constraints[concatenation(["alternateResponse",value, value2])] = 1;
  }
  else if (value2 == called && constraints[concatenation(["alternateResponse",value, value2])] == 2) {
    constraints[concatenation(["alternateResponse",value, value2])] = 0;
  }
}

let notCoexistenceEnum = {
  0: ts,
  1: pv,
  2: ts,
  3: ts,
}

//starts with 0 = ts goes to 2 = ts if value2 enters. if is in 2 = ts and a value enters go in 1 = pv. if is in 0 = ts and value enters go in 3 = ts, and if value 2 enters go in 1 = pv
function notCoexistence(value, value2, called) {
  if (value == called && constraints[concatenation(["notCoexistence",value, value2])] == 0) {
    constraints[concatenation(["notCoexistence",value, value2])] = 3;
    operations[value2] = statusOperations.LOCKED;
  }
  else if (value2 == called && constraints[concatenation(["notCoexistence",value, value2])] == 3) {
    constraints[concatenation(["notCoexistence",value, value2])] = 1;
  }
  else if (value2 == called && constraints[concatenation(["notCoexistence",value, value2])] == 0) {
    constraints[concatenation(["notCoexistence",value, value2])] = 2;
    operations[called] = statusOperations.LOCKED;
  }
  else if (value == called && constraints[concatenation(["notCoexistence",value, value2])] == 2) {
    constraints[concatenation(["notCoexistence",value, value2])] = 1;
  }
}

let notChainSuccessionEnum = {
  0: ts,
  1: pv,
  2: ts,
}

//starts with 0 = ts goes to 2 = ts if value enters. if is in 2 = ts and a value2 enters go in 1 = pv else if something different value or value2 return in 0=ts
function notChainSuccession(value, value2, called) {
  if (value == called && constraints[concatenation(["notChainSuccession",value, value2])] == 0) {
    constraints[concatenation(["notChainSuccession",value, value2])] = 2;
    operations[value2] = statusOperations.LOCKED;
  }
  else if (value2 == called && constraints[concatenation(["notChainSuccession",value, value2])] == 2) {
    constraints[concatenation(["notChainSuccession",value, value2])] = 1;
  }
  else if (value != called && value2 != called && constraints[concatenation(["notChainSuccession",value, value2])] == 2) {
    constraints[concatenation(["notChainSuccession",value, value2])] = 0;
  }
}

let absence2Enum = {
  0: ts,
  1: pv,
  2: ts,
}

//starts with 0 = ts goes to 2 = ts if value enters. if is in 2 = ts and a value enters go in 1 = pv
function absence2(value, value2, called) {
  if (value == called && constraints[concatenation(["absence2",value, value2])] == 0) {
    constraints[concatenation(["absence2",value, value2])] = 2;
    operations[called] = statusOperations.LOCKED;
  }
  else if (value == called && constraints[concatenation(["absence2",value, value2])] == 2) {
    constraints[concatenation(["absence2",value, value2])] = 1;
  }
}

let CoexistenceEnum = {
  0: ts,
  1: ps,
  2: tv,
  3: tv,
}

//starts with 0 = ts goes to 2 = tv if value2 enters. if is in 2 = tv and a value enters go in 1 = ps. if is in 0 = ts and value enters go in 3 = tv, and if value 2 enters go in 1 = ps
function Coexistence(value, value2, called) {
  if (value == called && constraints[concatenation(["Coexistence",value, value2])] == 0) {
    constraints[concatenation(["Coexistence",value, value2])] = 3;
  }
  else if (value2 == called && constraints[concatenation(["Coexistence",value, value2])] == 3) {
    constraints[concatenation(["Coexistence",value, value2])] = 1;
  }
  else if (value2 == called && constraints[concatenation(["Coexistence",value, value2])] == 0) {
    constraints[concatenation(["Coexistence",value, value2])] = 2;
  }
  else if (value == called && constraints[concatenation(["Coexistence",value, value2])] == 2) {
    constraints[concatenation(["Coexistence",value, value2])] = 1;
  }
}

let notSuccessionEnum = {
  0: ts,
  1: pv,
  2: ts,
}

//starts with 0 = ts goes to 2 = ts if value enters. if is in 2 = ts and a value2 enters go in 1 = pv
function notSuccession(value, value2, called) {
  if (value == called && constraints[concatenation(["notSuccession",value, value2])] == 0) {
    constraints[concatenation(["notSuccession",value, value2])] = 2;
    operations[value2] = statusOperations.LOCKED;
  }
  else if (value2 == called && constraints[concatenation(["notSuccession",value, value2])] == 2) {
    constraints[concatenation(["notSuccession",value, value2])] = 1;
  }
}



//look for the presence of errors reported in the dictionary with the value pv


function findError() {
  for (var prop in constraints) {
    const app = prop.substring(0, prop.indexOf(separator));
    if (eval(app.concat("Enum"))[constraints[prop]] == 'pv') {
      console.log('Error in: ' + prop);
      return false;
    }
  }
  return true;
}

//looks for errors when the terminate action is sent


function findErrorTerminate() {
  for (var prop in constraints) {
    const app = prop.substring(0, prop.indexOf(separator));
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

function concatenation(values){
  let stringApp= values[0];

  for (let i = 1; i< values.length; i++){
    stringApp += separator;
    stringApp += values[i];
  }
  return stringApp;
}


/*
Main function: First call trim Null.
subsequently it checks the status of the called operation, checking if it is not locked. 
If it is not, it calls the check function with the value called and checks if the operation called is TERMINATE (ie the last one) 
and in this case it checks with findError for errors and if it returns it returns that everything is good.
Otherwise it will throw an error and restore the system state to the previous call.
If the call is different from Terminate in this case it will update Order.
*/
const User = (Who) => ({

  Main: (value) => {
    value = trimNull(value);

    if (operations[value] != statusOperations.LOCKED) {
      const OperationsSAFE = { ...operations };
      const constraintsSafe = { ...constraints };
      operations[value] = statusOperations.ENABLED;
      check(value);
      if (value != "TERMINATE") {
        if (findError() == true) {
          Order.push(value);
          console.log(operations);
          console.log(constraints);
          console.log(Order);

          return true;
        }
        else {
          operations = OperationsSAFE;
          constraints = constraintsSafe;
          console.log("Action denied");
          return false;
        }
      }
      else {

        if (findErrorTerminate() == true) {
          Order.push(value);
          console.log(operations);
          console.log(constraints);
          console.log(Order);
          console.log("ALL GOODS")
          return true;
        }
        else {
          operations = OperationsSAFE;
          constraints = constraintsSafe;
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
  ctcAlice.p.Alice({
    ...User('Alice'),
    pay: stdlib.parseCurrency(5),
  }),
  ctcBob.p.Bob({
    ...User('Bob'),
    acceptPayment: (amt) => {
      console.log(`Agency accepts the Payment of ${fmt(amt)}.`);
    },
  }),
  
]);

const afterAlice = await getBalance(accAlice);
const afterBob = await getBalance(accBob);

console.log(`User went from ${beforeAlice} to ${afterAlice}.`);
console.log(`Agency went from ${beforeBob} to ${afterBob}.`);



