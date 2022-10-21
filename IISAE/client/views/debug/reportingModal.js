import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

Template.reportingModal.onCreated(function() {
    this.currentUpload = new ReactiveVar(false);
    this.uploadedFile = new ReactiveVar(false);
});

Template.reportingModal.events({
    'click #reportingModal': function(event) {
        //prevent default
        event.preventDefault();
        //get the user's name
        var name = Meteor.user().firstname + " " + Meteor.user().lastname;
        //get the user's email
        var email = Meteor.user().emails[0].address;
        //get the user's organization
        var org = Orgs.findOne({orgOwnerId: Meteor.userId()});
        //get the typeError
        var typeError = $('#errorType').val();
        //get the errorReport
        var errorReport = $('#errorReport').val();
        //get the window size
        var windowSize = Session.get('windowSize');
        //get the user's browser
        var browser = navigator.userAgent;
        //get the user's OS
        var os = navigator.platform;
        //get the user's current URL
        var url = window.location.href;
        //get the user's current page
        var page = window.location.pathname;
        //get the user's current page title
        var pageTitle = document.title;
        //get template instance
        var instance = Template.instance();
        //get screenshot of the current page
        var screenshot = instance.uploadedFile.get();
        //put all the data into an object
        var data = {
            name: name,
            email: email,
            org: org,
            typeError: typeError,
            errorReport: errorReport,
            windowSize: windowSize,
            browser: browser,
            os: os,
            url: url,
            page: page,
            pageTitle: pageTitle,
            screenshot: screenshot
        };
        //send the data to the server
        Meteor.call('sendErrorReport', data, function(error, result) {
            if(error){
                console.log(error);
            } else {
                alert("Thank you for your feedback. We will get back to you as soon as possible.");
                //clear the form
                $('#errorType').val("");
                $('#errorReport').val("");
            }
        }
        );
    },
    'change #fileInput'(e, template) {
        if (e.currentTarget.files && e.currentTarget.files[0]) {
          // We upload only one file, in case
          // multiple files were selected
          const upload = FileStore.insert({
            file: e.currentTarget.files[0],
            chunkSize: 'dynamic'
          }, false);
    
          upload.on('start', function () {
            template.currentUpload.set(this);
          });
    
          upload.on('end', function (error, fileObj) {
            if (error) {
              alert(`Error during upload: ${error}`);
            } else {
              alert(`File "${fileObj.name}" successfully uploaded`);
              link = FileStore.link(fileObj);
              console.log(link);
              template.uploadedFile.set(link);
            }
            template.currentUpload.set(false);
          });
    
          upload.start();
        }
    },
});