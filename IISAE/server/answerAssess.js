// Answer Assessment Engine

import {LSA} from './macineLearning/LSA'
export function answerAssess(correctAnswer, response, type="simpleMatch"){
    console.log("Assess Answer:", correctAnswer, response);
    if(type == "simpleMatch"){
        data = simpleMatch(correctAnswer.toLowerCase(), response.toLowerCase());
    }
    if(type == "simpleMatchLSAFallback"){
    };
    return data;
}
function simpleMatch(correctAnswer, response){
    if(response.toLowerCase().trim() == correctAnswer.toLowerCase().trim()){
        isCorrect = true;
    } else {
        isCorrect = false;
    }
    data = {
        isCorrect: isCorrect
    }
    return data;
}
function simpleMatchLSAFallback(corperaId, response){

}
