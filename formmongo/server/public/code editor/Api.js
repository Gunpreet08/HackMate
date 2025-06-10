const express=require("express")
const app=express()
const bodyP=require("body-parser")
const compiler=require("compilex")
const cors = require("cors");  // ✅ Add this line

app.use(cors()); // ✅ Allow cross-origin requests
const options={stats:true}
compiler.init(options)
app.use(bodyP.json())
// ✅ Serve static files (CSS, images, etc.)
app.use(express.static(__dirname));
app.use("/codemirror-5.65.19",express.static("C:/Users/Dell/OneDrive/Desktop/code editor/codemirror-5.65.19"))
app.get("/",function(req,res){
    // compiler.flush(function(){
    //     console.log("deleted")
    // })
    res.sendFile("C:/Users/Dell/OneDrive/Desktop/code editor/index.html")
})
app.post("/compile",function(req,res){
    var code=req.body.code
    var input=req.body.input
    var lang=req.body.lang
    try {
        if(lang=="Cpp"){
            if(!input){ 
                var envData = { OS : "windows" , cmd : "g++", options:{timeout:10000}}; // (uses g++ command to compile )
                compiler.compileCPP(envData , code , function (data) {
                    if(data.output){
                        res.send(data);
                    }
                    else{
                        res.send({output:"error"})
                    }
                });
            }
            else{
                var envData = { OS : "windows" , cmd : "g++", options:{timeout:10000}}; // (uses g++ command to compile )
                compiler.compileCPPWithInput(envData , code , input , function (data) {
                    if(data.output){
                        res.send(data);
                    }
                    else{
                        res.send({output:"error"})
                    }
                });
            }
        }  
        else if(lang=="Java"){
            if(!input){
                var envData = { OS : "windows"}; 
                compiler.compileJava( envData , code , function(data){
                    if(data.output){
                        res.send(data);
                    }
                    else{
                        res.send({output:"error"})
                    }
                });    
            }
            else{
                var envData = { OS : "windows"}; 
                compiler.compileJavaWithInput( envData , code , input ,  function(data){
                    if(data.output){
                        res.send(data);
                    }
                    else{
                        res.send({output:"error"})
                    }
                });
            }

        }
        else if(lang=="Python"){ 
            if(!input){
                var envData = { OS : "windows"}; 
                compiler.compilePython( envData , code , function(data){
                    if(data.output){
                        res.send(data);
                    }
                    else{
                        res.send({output:"error"})
                    }
                });
            }
            else{
                var envData = { OS : "windows"}; 
                compiler.compilePythonWithInput( envData , code , input ,  function(data){
                    if(data.output){
                        res.send(data);
                    }
                    else{
                        res.send({output:"error"})
                    }        
                });
            }       
        }
    } 
    catch (e) {
        console.log("error")
    }

})

app.listen(8000)