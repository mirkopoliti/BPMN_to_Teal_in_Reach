'reach 0.1';


const User = {
  Main: Fun([Bytes(32)], Bool),
  
};
const Agency = {
  Serve: Fun([], Array(Bytes(32), 32)),
};


export const main = Reach.App(() => {
  const Alice = Participant('Alice', {
    ...User,
  });
  const Bob   = Participant('Bob', {
    ...Agency,
  });
  deploy();


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
