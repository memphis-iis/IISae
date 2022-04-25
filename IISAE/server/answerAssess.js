// Answer Assessment Engine

function answerAssess(correctAnswer, response, type="simpleMatch"){
    if(type == "simpleMatch"){
        if(response.toLowerCase() == correctAnswer.toLowerCase()){
            feedback = true;
        } else {
            feedback = false;
        }
        return feedback;
    }
}
