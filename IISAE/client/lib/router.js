import { Meteor } from 'meteor/meteor';
import Chart from 'chart.js/auto'
/* router.js - the routing logic we use for the application.

If you need to create a new route, note that you should specify a name and an
action (at a minimum). This is good practice, but it also works around a bug
in Chrome with certain versions of Iron Router (they routing engine we use).

*/



//Set Default Template
Router.configure({
  layoutTemplate: 'DefaultLayout'
});

//Set Up Default Router Actions
const defaultBehaviorRoutes = [
  'login',
  'signup',
  'restricted',
  'code'
];

//Set Up Logged In Restricted Routes 
const restrictedRoutes = [
  'assessmentCenter',
  'createOrg',
  'profile',
  'moduleCenter',
  'calendar',
  'lsacreate',
  'modulesAdmin',
  'classAdmin',
  'usersAdmin',
  'joinClass'
]


const getDefaultRouteAction = function(routeName) {
  return function() {
    this.render(routeName);
  };
};

// set up all routes with default behavior
for (const route of defaultBehaviorRoutes) {
  Router.route('/' + route, {
    name: 'client.' + route,
    action: getDefaultRouteAction(route),
  });
}

// set up all routes with restricted to login behavior
for (const route of restrictedRoutes) {
  Router.route('/' + route, function() {
    if(Meteor.userId()){
      this.render(route);
      }else{
        this.render('home', {
          data: {
            message: "That area is not accessible to users who haven't logged in. Please sign in.",
            alert: "danger"
          }
        });
      }
    });
  }

// setup home route
Router.route('/', function () {
  this.render('home');
});

//setup logout
Router.route('/logout', function(){
  Meteor.logout();
  this.render('home');
})

// admin control panel route
Router.route('/control-panel', function () {
  if(Meteor.user()){
    if (Roles.userIsInRole(Meteor.user(), 'admin')) {
      this.render('adminControlPanel');
    }
    else if (Roles.userIsInRole(Meteor.user(), 'supervisor')) {
      this.render('adminControlPanel');
    }
    else{
      Router.go('/');
    }
  }
  else{
    Router.go('/');
  }
});

// route assessment engine
//intro
Router.route('/assessment/:_id', {
  subscriptions: function(){
    return Meteor.subscribe('curAssessment', this.params._id);
  },
  action: function(){
    this.render('assessment', {
      data:{
        isNotQuestion: true,
      }
    });
  }
});

Router.route('/userAssessmentReport/', {
  action: function(){
    this.render('userAssessmentReportLanding', {
      params: {
        assessmentIdentifier: this.params._identifier
      }
    });

  }
});

Router.route('/userAssessmentReport/:_identifier', {
  action: function(){
    this.render('userAssessmentReport', {
      params: {
        assessmentIdentifier: this.params._identifier
      }
    });
  }
});

Router.route('/userAssessmentReport/supervisor/:_userid/', {
  action: function(){
    this.render('userAssessmentReportLanding', {
      params: {
        userId: this.params._userid,
      }
    });
  }
});

Router.route('/userAssessmentReport/supervisor/:_userid/:_identifier', {
  action: function(){
    this.render('userAssessmentReport', {
      params: {
        userId: this.params._userid,
        assessmentIdentifier: this.params._identifier
      }
    });
  }
});

//question
Router.route('/assessment/:_id/:_questionid', {
  subscriptions: function(){
    return Meteor.subscribe('curAssessment', this.params._id);
  },
  action: function(){
    this.render('assessment', {
      data:{
        isNotQuestion: false,
        questionid: this.params._questionid,
      }
    });
  }
});
// editing modules
Router.route('/moduleEditor/:_moduleId', {
  action: function(){
    this.render('moduleEditor', {
      data:{
        moduleId: this.params._moduleId,
      }
    });
  }
});

// route module engine
//intro
Router.route('/module/:_id', {
  subscriptions: function(){
    return Meteor.subscribe('curModule', this.params._id);
  },
  action: function(){
    this.render('module', {
      data:{
        moduleId: this.params._id
      }
    });
  }
});
//module page id
Router.route('/module/:_id/:_pageid', {
  subscriptions: function(){
    subs = [];
    subs.push(Meteor.subscribe('curModule', this.params._id));
    subs.push(Meteor.subscribe('getUserModuleResults'));
    return subs;
  },
  action: function(){
    this.render('module', {
      data:{
        pageId: this.params._pageid,
        moduleId: this.params._id
      }
    });
  }
});

//module quiz page question id
Router.route('/module/:_id/:_pageid/:_questionid', {
  template: 'module',
  waitOn: function(){
    subs = [];
    subs.push(Meteor.subscribe('curModule', this.params._id));
    subs.push(Meteor.subscribe('getUserModuleResults'));
    return subs;
  },
  data: function(){
    if(this.ready()){
      questionPrompt = Modules.findOne().pages[this.params._pageid].questions[this.params._questionid].prompt;
      data = {
        pageId: this.params._pageid,
        questionId: this.params._questionid,
        moduleId: this.params._id,
        prompt: questionPrompt,
        autoTutorReadsPrompt: true
      }
      return data
    }
  }
});
Router.route('/module/:_id/:_pageid/:_questionid/:_command', {
  template: 'module',
  waitOn: function(){
    subs = [];
    subs.push(Meteor.subscribe('curModule', this.params._id));
    subs.push(Meteor.subscribe('getUserModuleResults'));
    return subs;
  },
  data: function(){
    if(this.ready()){
      questionPrompt = Modules.findOne().pages[this.params._pageid].questions[this.params._questionid].prompt;
      data = {
        pageId: this.params._pageid,
        questionId: this.params._questionid,
        moduleId: this.params._id,
        prompt: questionPrompt,
        autoTutorReadsPrompt: true,
        command: this.params._command
      }
      return data
    }
  }
});
// route organizational invites
Router.route('/signup/:_id', function(){
  // add the subscription handle to our waitlist
  if(Meteor.user()){
    Router.go('/');
  }
  id = this.params._id;
  Meteor.call('getInviteInfo', id, (err, res) => {
    var {targetOrgId, targetOrgName, targetSupervisorId, targetSupervisorName} = res;
    if(err || typeof targetOrgId === 'undefined'){
      this.render('linkNotFound');
    } else {
      this.render('signup', {
        data: {
          orgName: targetOrgName,
          supervisorName: targetSupervisorName,
          supervisorId: targetSupervisorId,
          linkId: id
        }
      });
    }});
  })

// route module results report
Router.route('/moduleReport/:_id', {
  subscriptions: function(){
    subs = [];
    subs.push(Meteor.subscribe('getModuleResultsByTrialId', this.params._id));
    return subs;
  },
  action: function(){
    if(Meteor.user()){
      if (Roles.userIsInRole(Meteor.user(), 'admin') || Roles.userIsInRole(Meteor.user(), 'supervisor')  ) {
        this.render('moduleReport');
      }
    } else {
      this.render('/');
    }
  }
});
//Route Static Assets
