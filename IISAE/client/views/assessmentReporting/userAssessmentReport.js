import Chart from 'chart.js/auto'

Template.userAssessmentReport.helpers({
    'subscaleScores': function() {
        const curTrial = getCurrentTrial();
        const assessment = getCurrentAssessment();
        if(assessment && curTrial){
            const subscales = Object.keys(assessment.assessmentReportConstants.subscaleTitles);
            let scales = [];

            for(let subscale of subscales){
                scales.push({
                    'subscaleName': assessment.assessmentReportConstants.subscaleTitles[subscale],
                    'subscaleScore': curTrial.subscaleTotals[subscale]
                })
            }
            return scales;
        }
    }, 
    'chart': function() {
        if(!document.getElementById("trialReportChart")){
            Meteor.setTimeout(function() {
                drawChart()
            }, 100)
        }
        else{
            drawChart();
        }
    },
    'tooltips': function() {
        const assessment = getCurrentAssessment();
        if(assessment){
            return assessment.assessmentReportConstants.resultParagraphs
        }
    },
    'displayCritItems': function() {
        return Router.current().params._identifier.toUpperCase() == 'DHS'
    },
    'criticalItems': function() {
        const assessment = getCurrentAssessment();
        const curTrial = getCurrentTrial();
        if(assessment && curTrial){
            const criticalItems = assessment.assessmentReportConstants.criticalItems;
            const subscales = Object.keys(assessment.assessmentReportConstants.criticalItems);
            let items = []
            if(criticalItems){
                for(let criticalItem of criticalItems){
                    items.push({
                        "itemName": assessment.questions[criticalItem].text,
                        "itemValue": curTrial.data[criticalItem].responseValue > 0 ? "Y" : "N"
                    });
                }
            }
            return items;
        }
    }
});

Template.userAssessmentReport.events({
    'click .tabLinks': function(event) {
        const target = $(event.currentTarget);
        var i, tabcontent, tablinks;
        tabcontent = document.getElementsByClassName("tabcontent");
        for (i = 0; i < tabcontent.length; i++) {
          tabcontent[i].style.display = "none";
        }
        tablinks = document.getElementsByClassName("tablinks");
        for (i = 0; i < tablinks.length; i++) {
          tablinks[i].className = tablinks[i].className.replace(" active", "");
        }
        document.getElementById(event.currentTarget.dataset.linkname).style.display = "block";
        target.className += " active";
    }
})

Template.userAssessmentReport.onCreated(function() {
    Meteor.subscribe('usertrials');
    Meteor.subscribe('assessments');
});

function drawChart(){
    const curTrial = getCurrentTrial();
    const assessment = getCurrentAssessment();
    if(assessment){
        const subscales = Object.keys(assessment.assessmentReportConstants.subscaleTitles)
        let scales = {}
    
        for(let subscale of subscales){
            scales[subscale] = curTrial.subscaleTotals[subscale]
        }
        const ctx = document.getElementById("trialReportChart").getContext('2d');
        const data = {
            labels: Object.keys(scales),
            datasets: [{
                data: Object.values(scales),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(255, 159, 64, 0.2)',
                    'rgba(255, 205, 86, 0.2)',
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(54, 162, 235, 0.2)',
                    'rgba(153, 102, 255, 0.2)',
                    'rgba(201, 203, 207, 0.2)'
                ],
                borderColor: [
                    'rgb(255, 99, 132)',
                    'rgb(255, 159, 64)',
                    'rgb(255, 205, 86)',
                    'rgb(75, 192, 192)',
                    'rgb(54, 162, 235)',
                    'rgb(153, 102, 255)',
                    'rgb(201, 203, 207)'
                ],
                borderWidth: 1
            }]
        };
        const chart = new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                maintainAspectRatio: false,
                scales: {
                y: {
                    beginAtZero: true
                }
                },
                plugins: {
                    title: {
                        display: true,
                        text: assessment.assessmentReportConstants.chartTitle
                    },
                    legend: {
                    display: false
                    }
                }
            },
        });
    }
}

function getCurrentAssessment(){
    const identifier = Router.current().params._identifier.toUpperCase()
    return Assessments.findOne({"identifier": identifier});
}

function getCurrentTrial(){
    const identifier = Router.current().params._identifier.toUpperCase()
    let userid = Meteor.userId();
    if(Roles.userIsInRole(Meteor.userId(), 'supervisor')){
        userid = Router.current().params._userid;
    }
    return Trials.find({'userId': userid, 'identifier': identifier}, {sort: {_id:-1}}).fetch()[0];
}