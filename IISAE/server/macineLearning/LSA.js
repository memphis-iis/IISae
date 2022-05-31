// This is an LSA Space Generator
// Developed by Rusty Haner and Rhodes White
// Institute of Intelligent Systems
// University of Memphis




import { SVD } from 'svd-js';
export class LSA{
    constructor(stopwords, ignorechars, name){
        this.stopwords = stopwords,
        this.name = name,
        this.ignorechars = ignorechars,
        this.wdict = {},
        this.dcount = 0,       
        this.corpera = []
        this.keys = [];
        this.svdWords = [];
        this.svdDocuments = [];
        this.relevantFeatures = [];
        this.meanCorperaCoordinates = [];
        this.meanRelevantCoordinates = [];
    }
    parse(corpus) {
        let corpusWithoutIgnoredChars = corpus;
        this.corpera.push({text: corpus});
        for(let char of this.ignorechars){
            corpusWithoutIgnoredChars.replace(/[^a-z0-9]/gmi, " ").replace(/\s+/g, " ");
        }
        let cleanCorpus = corpusWithoutIgnoredChars;
        let corpusWords = cleanCorpus.toLowerCase().split(" ");
        for(let word of corpusWords){
            if(this.stopwords.indexOf(word) == -1){
                if(typeof this.wdict[word] == "undefined"){
                    this.wdict[word] = [];
                } 
                this.wdict[word].push(this.dcount);
            }
        }
        this.dcount++;
    }
    build(){
        this.keys = [];
        for(let word of Object.keys(this.wdict)){
            if(this.wdict[word].length > 1){
                this.keys[word] = this.wdict[word];
            }
        }
        this.keys.sort();
        this.countMatrix =  new Array(Object.keys(this.keys).length).fill().map(() => Array(this.dcount).fill(0));
        for(let word of Object.keys(this.keys)){
            let i = Object.keys(this.keys).indexOf(word);
            for(let j = 0; j < this.wdict[word].length; j++){
                this.countMatrix[i][j]++;
            }
        }
    }
    printMatrix(){
        console.log(this.countMatrix);
    }
    printVocabulary(){
        console.log(this.keys);
    }
    TFIDF(){
        let rows = this.countMatrix.length;
        let columns = this.countMatrix[0].length;
        let wordsPerDoc = new Array(rows).fill(0);
        let docsPerWord = new Array(columns).fill(0);
        for(let i = 0; i < this.countMatrix.length; i++){
            for(let j=0; j < this.countMatrix[i].length; j++){
                wordsPerDoc[i]+=this.countMatrix[i][j];
                if(this.countMatrix[i][j] > 0){
                    docsPerWord[j]+=1;
                }
            }
        }
        for(let i = 0; i < this.countMatrix.length; i++){
            for(let j=0; j < this.countMatrix[i].length; j++){
                this.countMatrix[i][j] = (this.countMatrix[i][j] / wordsPerDoc[i]) * Math.log(parseFloat(columns) / (1 + docsPerWord[j]));
            }
        }
    }
    calc(){
        let {u,v,q} = SVD(this.countMatrix);
        this.svdWords = u;
        this.svdDocuments = v;
        let relevantFeatures = [];
        for(let i in q){
            if(q[i] > 0){
                relevantFeatures.push(parseInt(i));
            }
        }
        this.meanCorperaCoordinates = new Array(this.svdDocuments[0].length).fill(0);
        for(let i in this.svdDocuments[0]){
            for(let j in this.svdDocuments){
                this.meanCorperaCoordinates[i]+= this.svdDocuments[j][i];
            }
        }
        for(let i in this.meanCorperaCoordinates){
            this.meanCorperaCoordinates[i] = this.meanCorperaCoordinates[i] / this.dcount;
        }
        for(let i in relevantFeatures){
            this.meanRelevantCoordinates.push(this.meanCorperaCoordinates[relevantFeatures[i]]);
        }
        this.relevantFeatures = relevantFeatures;
    }
    calcSimple(){
        this.meanCorperaCoordinates = new Array(this.countMatrix[0].length).fill(0);
        for(let i in this.countMatrix[0]){
            for(let j in this.countMatrix){
                this.meanCorperaCoordinates[i]+= this.countMatrix[j][i];
            }
        }
        for(let i in this.meanCorperaCoordinates){
            this.meanCorperaCoordinates[i] = this.meanCorperaCoordinates[i] / this.dcount;
        }
    }
    addCorpusAndCompareToAverage(response){
        this.parse(response);
        this.build();
        this.TFIDF();
        this.calc();
        let A = this.meanCorperaCoordinates;
        let bCoords = this.svdDocuments[this.svdDocuments.length - 1];
        let bRelevantCoords = new Array(this.relevantFeatures.length).fill(0);
        for(let i in this.relevantFeatures){
            bRelevantCoords[i] = bCoords[i];
        }
        let cosSim = this.cosSim(A, bRelevantCoords);
        let eucDist = this.eucDist(A, bRelevantCoords);
        let data = {
            cosSim: cosSim,
            eucDist: eucDist
        }
        console.log(A, bCoords,data);
        return(data);
    }
    addCorpusAndCompareToAverageSimple(response){
        this.parse(response);
        this.build();
        this.TFIDF();
        this.calcSimple();
        let A = this.meanCorperaCoordinates;
        let bCoords = this.svdDocuments[this.svdDocuments.length - 1];
        let cosSim = this.cosSim(A, bCoords);
        let eucDist = this.eucDist(A, bCoords);
        let data = {
            cosSim: cosSim,
            eucDist: eucDist
        }
        console.log(A, bCoords,data);
        return(data);
    }
    cosSim(A,B){
        var dotproduct=0;
        var mA=0;
        var mB=0;
        for(let i = 0; i < A.length; i++){
            dotproduct += (A[i] * B[i]);
            mA += (A[i]*A[i]);
            mB += (B[i]*B[i]);
        }
        mA = Math.sqrt(mA);
        mB = Math.sqrt(mB);
        var similarity = (dotproduct)/((mA)*(mB));
        return similarity;

    }
    eucDist(a,b){
        return a
        .map((x, i) => Math.abs( x - b[i] ) ** 2) 
        .reduce((sum, now) => sum + now)
        ** (1/2);
    }
    dump(){
        var variables = {};
        for (var name in this){
            variables[name] = this[name];
        }
        return variables;
    }
    load(variables){
        for (var name in variables){
            this[name] = variables[name];
        }
    }
}
