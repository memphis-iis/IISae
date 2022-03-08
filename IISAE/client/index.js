import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import WebPush, { CordovaPush } from 'meteor/activitree:push';

Template.DefaultLayout.onCreated(function() {

})

Meteor.startup(() => {
  Meteor.subscribe('files.images.all');
  if (Meteor.isCordova) {
    // Check cordova-push-plugin for all options supported.
    // The configuration object is used to initialize Cordova Push on the device.
    CordovaPush.Configure({
      appName: 'ISSAE',
      debug: true, // Turns on various console messages in the Cordova console.
      android: {
        alert: true,
        badge: true,
        sound: true,
        vibrate: true,
        clearNotifications: true,
        icon: 'statusbaricon',
        iconColor: '#337FAE',
        forceShow: true
      },
      ios: {
        alert: true,
        badge: true,
        sound: true,
        clearBadge: true,
        topic: 'com.your_app_id' // your IOS app id.
      }
    })
  } else {
    WebPush.Configure({
      appName: 'ISSAE', // required
      debug: true, 
      firebase: {
        apiKey: '________',
        authDomain: '_______',
        projectId: '________________',
        messagingSenderId: '_________________',
        appId: '_______________',
      },
      publicVapidKey: '____________'
    })
  }
})
Template.DefaultLayout.helpers({
  'footer': function(){
      footer.copyright = "Copyright 2022";
      footer.message = "ISSAE is developed by The Institute for Intelligent Systems at The University of Memphis."
      return footer;
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
