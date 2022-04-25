// Answer Assessment Engine

function answerAssess(correctAnswer, response, type){
    if(type == "simpleMatch"){
        if(response.toLowerCase() == correctAnswer.toLowerCase()){
            feedback = true;
        } else {
            feedback = false;
        }
        return feedback;
    }
}
