import { Meteor } from 'meteor/meteor';
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
  'restricted'
];

//Set Up Logged In Restricted Routes 
const restrictedRoutes = [
  'assessmentCenter',
  'createOrg',
  'profile'
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

// admin control panel route
Router.route('/control-panel', function () {
  if(Meteor.user()){
    if (Roles.userIsInRole(Meteor.user(), 'admin')) {
      this.render('adminControlPanel');
    }
    else if (Roles.userIsInRole(Meteor.user(), 'supervisor')) {
      this.render('supervisorControlPanel');
    }
    else{
      Router.go('/');
    }
  }
  else{
    Router.go('/');
  }
});

// restricted to logged in users routes
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
          linkId: id
        }
      });
    }});
  })   
