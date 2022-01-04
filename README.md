# Declare_to_Teal_in_Reach
Declarative process models using distributed smart-contracts in Reach.
I

## Requirements

Visual Studio Code: https://code.visualstudio.com/

Reach IDE: https://marketplace.visualstudio.com/items?itemName=reachsh.reach-ide

Docker: https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-docker

For more informations and check before run: https://docs.reach.sh/tut/rps/#tut-3 (Install and Initialize)

## Foreplay

A simple programs in reach need only two files: index.rhs and index.mjs.The front-end and the back-end respectively

## index.rhs

This file contains the application's frontend.
It's very simple, we have only two actor that interface. One is the User and the other is the Agency.
The latter has only the function of representing to whom the cost for the use of the smart-contract service will be paid.
The user instead is the main Actor. He has a method for making requests to the smart contract.

## index.mjs

This file contains the application's backend.
As you can see is written in Javascript and contain the implementation of the Actor's method. 

## test.json

This file contains an example test in json. 
Other files are not allowed.

## How to Run 

After having installed all the Requirements and consulted the doc in the Install And Initialize section, we can proceed to test the application.

In the terminal run the command:

 <pre><code>./reach run
</code></pre>

## How to test 

If you want to change the test is very simple.
You have only to add the new file.json in the folder and rename the file in the code here:

 <pre><code> line 12: const file = JSON.parse(await readFile('./test.json'));
</code></pre>

Once this is done, everything will be done automatically and you just need to go to the index.rhs file and change the lines of code in which the requests are made

So change:

<pre><code> Alice.only(() => {
      const Request1 = declassify(interact.Main(Bytes(32).pad('Login')));
      const Request2 = declassify(interact.Main(Bytes(32).pad('AddToCard')));
      const Request3 = declassify(interact.Main(Bytes(32).pad('Buy')));
      const Request4 = declassify(interact.Main(Bytes(32).pad('Logout')));
      const Request5 = declassify(interact.Main(Bytes(32).pad('TERMINATE')));
      
    });
</code></pre>

With your requests. 
For example you can do: 
<pre><code> Alice.only(() => {
      const Request1 = declassify(interact.Main(Bytes(32).pad('CreateOrder')));
      const Request2 = declassify(interact.Main(Bytes(32).pad('TrackOrder')));
      const Request3 = declassify(interact.Main(Bytes(32).pad('TERMINATE')));
      
    });
</code></pre>

Once you have finished making requests, it is very important to make a termination request, otherwise the smart-contract will not terminate and will remain listening




















