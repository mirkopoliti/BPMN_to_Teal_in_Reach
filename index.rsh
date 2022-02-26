//Indicates that this is a Reach program. You'll always have this at the top of every program.
'reach 0.1';

//import { IntDecoding } from "algosdk";

//Lines 5 through 9 specify the two participants to this application, User and Agency.
const User = {
  Main: Fun([Bytes(32)], Bool),
  
};
const Agency = {};

/*
Use this interface for both participants. 
Because of this line, interact in the rest of the program will be bound to an object with methods corresponding to these actions,
 which will connect to the frontend of the corresponding participant
*/
export const main = Reach.App(() => {
  const Alice = Participant('Alice', {
    ...User,
    pay: UInt,
  });
  const Bob   = Participant('Bob', {
    ...Agency,
    acceptPayment: Fun([UInt], Null),
  });
  init();

    //States that this block of code is something that only Alice performs.
    
    Alice.only(() => {
      const pay = declassify(interact.pay);
            
    });

    //Alice.publish(Request5);
    Alice.publish(pay)
    .pay(pay);
    commit();

    Bob.only(() => {
      interact.acceptPayment(pay);
    });
    Bob.publish();
 
    transfer(pay).to(Bob);
    commit();

    Alice.only(() => {
      const Request1 = declassify(interact.Main(Bytes(32).pad('Examine patient')));
      const Request2 = declassify(interact.Main(Bytes(32).pad('Check X-ray risk')));
      const Request3 = declassify(interact.Main(Bytes(32).pad('Perform X-ray')));
      const Request4 = declassify(interact.Main(Bytes(32).pad('Perform reposition')));
      const Request5 = declassify(interact.Main(Bytes(32).pad('TERMINATE')));
    });

  });
