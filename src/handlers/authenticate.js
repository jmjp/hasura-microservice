
const fetch = require("node-fetch");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login_by_email = `
query UserByIdentifier($identifier: String) {
    users(limit: 1,where: {email: {_eq: $identifier}}) {
      email,
      password, 
      id,
      type
    }
  }
`;

const login_by_username = `
query UserByIdentifier($identifier: String) {
    users(limit: 1,where: {username: {_eq: $identifier}}) {
      username,
      password, 
      id,
      type
    }
  }
`;

// execute the parent operation in Hasura
const execute = async (variables,isEmail) => {
  const fetchResponse = await fetch(
    "https://spaces-cloud.herokuapp.com/v1/graphql",
    {
      method: 'POST',
      body: JSON.stringify({
        query: isEmail == true ? login_by_email  : login_by_username,
        variables
      })
    }
  );
  const data = await fetchResponse.json();
  console.log('DEBUG: ', data);
  return data;
};
  




// Request Handler
const handler = async (req,res) => {

  // get request input
  const { identifier, password } = req.body.input;

  // run some business logic
  let isEmail = identifier.includes('@') && identifier.includes('.') ? true : false;
  
  // execute the Hasura operation
  const { data, errors } = await execute({ identifier },isEmail);


  // if Hasura operation errors, then throw error
  if (errors) {
    return res.status(400).json(errors[0])
  }
  if(data.users.length == 0){
      return res.status(400).json({message: "no user with this identifier"});
  }

  const user = data.users[0];
  var match = await bcrypt.compareSync(password,user.password);
  if(!match){
      return res.status(401).json({message: "password or username not matched"});
  }
  const tokenContents = {
    sub: user.id.toString(),
    iat: Date.now() / 1000,
    iss: 'https://spaces-cloud.herokuapp.com/',
    "https://hasura.io/jwt/claims": {
      "x-hasura-allowed-roles": user.type == "user" ? ["user"] : ["professional"],
      "x-hasura-user-id": user.id.toString(),
      "x-hasura-default-role": user.type == "user" ? ["user"] : ["professional"],
      "x-hasura-role": user.type == "user" ? ["user"] : ["professional"]
    },
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
  }
  const token = jwt.sign(tokenContents, process.env.SECRET_KEY);

  // success
  return res.json({
    id: user.id,
    token: token
  })

};

module.exports = handler;