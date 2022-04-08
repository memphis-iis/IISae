//Publications and Mongo Access Control
Meteor.users.deny({
    update() { return true; }
});

Meteor.users.allow({

});

//Show current user data for current user
Meteor.publish(null, function() {
    return Meteor.users.find({_id: this.userId});
});


//allow admins to see all users of org, Can only see emails of users. Can See full data of supervisors
Meteor.publish('getUsersInOrg', function() {
    if(Roles.userIsInRole(this.userId, 'admin' )){ 
        return Meteor.users.find({ organization: Meteor.user().organization, role: 'user' });
    }
    else if(Roles.userIsInRole(this.userId, 'supervisor')){
        return Meteor.users.find({ organization: Meteor.user().organization, role: 'user', supervisor: this.userId})
    }
});

Meteor.publish('getSupervisorsInOrg', function() {
    if(Roles.userIsInRole(this.userId, 'admin')){
        return Meteor.users.find({ organization: Meteor.user().organization, role: 'supervisor' });
    }
});

//Allow users access to Org information
Meteor.publish(null, function() {
    if(Meteor.user()){
        return Orgs.find({_id: Meteor.user().organization});
    }
});

//allow the use of Roles.userIsInRole() accorss client
Meteor.publish(null, function () {
    if (this.userId) {
        return Meteor.roleAssignment.find({ 'user._id': this.userId });
    } 
    else {
        this.ready()
    }
});
//allow current module pages to be published
Meteor.publish('curModule', function (id) {
    return Modules.find({_id: id});
});
//allow all modules to be seen
Meteor.publish('modules', function () {
    return Modules.find({});
});
//get module results
Meteor.publish('getUserModuleResults', function (id) {
    return ModuleResults.find({});
});

Meteor.publish('getModuleResultsByTrialId', function (id) {
    return ModuleResults.find({_id: id});
});
//get my events
Meteor.publish(null, function() {
    return Events.find({createdBy: this.userId});
});

//get all organization events
Meteor.publish('events', function() {
    console.log(Meteor.user().organization, this.userId)
    if(Meteor.user()){
        return Events.find({$or: [{ $and: [{org: Meteor.user().organization},{createdBy: this.userId}]},{$and:[{createdBy: Meteor.user().supervisor},{type:"Supervisor Group"}]},{$and: [{org: Meteor.user().organization},{type: "All Organization"}]},{type:this.userId}]}, {sort: {year:1 , month:1, day:1, time:1}})
    }
});