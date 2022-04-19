import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import WebPush, { CordovaPush } from 'meteor/activitree:push';

Template.DefaultLayout.onCreated(function() {

})

Meteor.startup(() => {
  Meteor.subscribe('files.images.all');
});
Template.DefaultLayout.helpers({
  'footer': function(){
    return {copyright: "Copyright 2022", message: "IISAE is developed by The Institute for Intelligent Systems at The University of Memphis." };
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
