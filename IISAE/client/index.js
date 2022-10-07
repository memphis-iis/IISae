import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import WebPush, { CordovaPush } from 'meteor/activitree:push';

Template.DefaultLayout.onCreated(function() {

})

Template.DefaultLayout.onRendered(function(){
  //check if HTML5 autoplay is enabled
  var video = document.createElement('video');
  var canPlay = video.canPlayType('video/mp4');
  if(canPlay == 'maybe' || canPlay == 'probably'){
  } else {
    //HTML5 autoplay is not enabled
    //check if browser is Safari
    if(navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1){
      alert("Please enable HTML5 autoplay in Safari settings");
    } else {
      alert("Please enable HTML5 autoplay in your browser");
    }
  }
})

Meteor.startup(() => {
  Meteor.subscribe('files.images.all');
  //add session variable when window resizes to trigger reactivity
  $(window).on('resize', function(){
   //get window width
    var width = $(window).width();
    //get window height
    var height = $(window).height();
    //add width and height together
    var size = width + height;
    //set session variable to size
    Session.set('windowSize', size);
  });
});
Template.DefaultLayout.helpers({
  'footer': function(){
    return {copyright: "Copyright 2022", message: "IISAE is developed by The Institute for Intelligent Systems at The University of Memphis." };
  },
  'title': function(){
    title = Meteor.settings.public.title;
    if(!title){
      title = "IISAE";
    }
    window.document.title = title + " on the ISSAE engine";
    return title;
  }  
})
Template.DefaultLayout.events({
  'click #logoutButton': function(event) {
    event.preventDefault();
    Router.go("/logout");
  },

  'click #navbar-brand': function(event){
    event.preventDefault();
    Router.go("/");
  }
});

Template.DefaultLayout.helpers({
  'organization': function () {
     orgs = Orgs.findOne();
     orgSplit = orgs.orgName.split(" ");
     newOrgName = orgs.orgName;
     if(orgSplit.length > 1){
        newOrgName = "";
        for(i = 0; i < Math.max(orgSplit.length - 1, 2); i++){
          newOrgName += orgSplit[i].charAt(0);
        }
     } else {
        newOrgName = orgs.orgName.substring(0,Math.min(3, orgs.orgName.length));
     }
     orgs.orgNameTruncated = newOrgName;
     return orgs;
  }
});
