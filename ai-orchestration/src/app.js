import express from "express";
import morgan from "morgan";

const app = express();

app.use(express.json());
app.use(morgan("common"));

app.get('/api/status/heathz',(req,res)=>{
    res.json(200).json({
        status:"OK"
    })
})

app.get('/api/ai/heathz',(req,res)=>{
    res.json(200).json({
        status:"success"
    })
})