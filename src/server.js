const express = require("express");
const bodyParser = require("body-parser");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/:route',(req,res) => {
  try{
    const handler = require(`./handlers/${req.params.route}`);
    if(!handler){
      return res.status(404).json({
        message: "route not found"
      });
    }
    return handler(req,res);
  }catch(e){
    console.error(e);
    return res.status(500).json({
      message: "unexpected error occured"
    })
  }
});

app.listen(PORT, () => console.log(`server running at ${PORT}`));
