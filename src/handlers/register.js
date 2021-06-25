
const fetch = require("node-fetch");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const HASURA_OPERATION = `
mutation SingUp($username: String, $password: String, $email: String, $type: String) {
  insert_users_one(object: {email: $email, password: $password, username: $username,type: $type}) {
    id,
    type
  }
}
`;

// execute the parent operation in Hasura
const execute = async (variables) => {
  const fetchResponse = await fetch(
    "https://spaces-cloud.herokuapp.com/v1/graphql",
    {
      method: 'POST',
      body: JSON.stringify({
        query: HASURA_OPERATION,
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
  const { username, password, email, type } = req.body.input;

  // run some business logic
  let hashPass = await bcrypt.hash(password,10)

  // execute the Hasura operation
  const { data, errors } = await execute({ username, password: hashPass, email,type });

  // if Hasura operation errors, then throw error
  if (errors) {
    return res.status(400).json(errors[0])
  }
  const tokenContents = {
    sub: data.insert_users_one.id.toString(),
    iat: Date.now() / 1000,
    iss: 'https://spaces-cloud.herokuapp.com/',
    "https://hasura.io/jwt/claims": {
      "x-hasura-allowed-roles": data.insert_users_one.type == "user" ? ["user"] : ["professional"],
      "x-hasura-user-id": data.insert_users_one.id.toString(),
      "x-hasura-default-role": data.insert_users_one.type == "user" ? "user" : "professional",
      "x-hasura-role": data.insert_users_one.type == "user" ? "user" : "professional",
    },
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
  }
  const token = jwt.sign(tokenContents, process.env.SECRET_KEY);

  // success
  return res.json({
    ...data.insert_users_one,
    token: token
  })

};

module.exports = handler;