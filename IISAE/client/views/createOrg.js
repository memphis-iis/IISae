import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

Template.createOrg.events({
    'click #orgCreate-submit': function(event) {
        event.preventDefault();
        var newOrgName = $('#organizationName').val();
        var newOrgOwner = Meteor.userId();
        var newOrgDesc = $('#orgDesc').val();
        useDefaultFlow = $('#useDefaultFlow').is(":checked");
        Meteor.call('createOrganization', newOrgName, newOrgOwner, newOrgDesc,useDefaultFlow);    
        Meteor.call('generateInvite', newOrgOwner, function(err, res) {
            orgUrl = window.location.protocol + "//" + window.location.host + "/signup/" + res;
            $('#step-1').hide();
            $('#orgLink').text(orgUrl);
            $('#orgLink').attr("href", orgUrl);
            $('#step-2').show();
        });
    },
    'click #admin-control-panel': function(event) {
        target = "/control-panel";
        Router.go(target);
    }
});