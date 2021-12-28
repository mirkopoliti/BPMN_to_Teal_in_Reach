//Indicates that this is a Reach program. You'll always have this at the top of every program.
'reach 0.1';

//Lines 5 through 9 specify the two participants to this application, User and Agency.
const User = {
  Main: Fun([Bytes(32)], Bool),
  
};
const Agency = {
  Serve: Fun([], Array(Bytes(32), 32)),
};

/*
Use this interface for both participants. 
Because of this line, interact in the rest of the program will be bound to an object with methods corresponding to these actions,
 which will connect to the frontend of the corresponding participant
*/
export const main = Reach.App(() => {
  const Alice = Participant('Alice', {
    ...User,
  });
  const Bob   = Participant('Bob', {
    ...Agency,
  });
  deploy();

    //States that this block of code is something that only Alice performs.
    Alice.only(() => {
      const test = declassify(interact.Main(Bytes(32).pad('Login')));
      const test2 = declassify(interact.Main(Bytes(32).pad('AddToCard')));
      const test3 = declassify(interact.Main(Bytes(32).pad('Buy')));
      const test4 = declassify(interact.Main(Bytes(32).pad('Logout')));
      const test5 = declassify(interact.Main(Bytes(32).pad('TERMINATE')));
      
    });
    Alice.publish(test);
    commit();

  });

