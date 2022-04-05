import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { Roles } from 'meteor/alanning:roles'; // https://github.com/Meteor-Community-Packages/meteor-roles
import { addUserToRoles } from './main'
const SEED_ADMIN = {
    username: 'testAdmin',
    password: 'password',
    email: 'testAdmin@memphis.edu',
    firstName: 'Johnny',
    lastName: 'Test',
    org : "IIS",
    supervisorID: "0",
    role: 'admin',
    supervisorInviteCode: "12345",
    sex: 'female',
    assigned: [],
    nextModule: -1
};
const SEED_SUPERVISOR = {
    username: 'testSupervisor',
    password: 'password',
    email: 'testSupervisor@memphis.edu',
    firstName: 'Supervisor',
    lastName: 'Test',
    org : "IIS",
    supervisorID: "0",
    role: 'supervisor',
    supervisorInviteCode: "12345",
    sex: 'male',
    assigned: [],
    nextModule: -1
};
const SEED_USER = {
    username: 'testUser',
    password: 'password',
    email: 'testUser@memphis.edu',
    firstName: 'User',
    lastName: 'Test',
    org : "IIS",
    supervisorID: "0",
    role: 'user',
    supervisorInviteCode: null,
    sex: 'female',
    assigned: null,
    hasCompletedFirstAssessment: false,
    nextModule: 0
};
const SEED_USER2 = {
    username: 'testUserNotInIIS',
    password: 'password',
    email: 'testUserNotInIIS@memphis.edu',
    firstName: 'User',
    lastName: 'Test',
    org : "alksdjhfaslkd",
    supervisorID: "0",
    role: 'user',
    supervisorInviteCode: null,
    sex: 'male',
    assigned: [],
    hasCompletedFirstAssessment: false,
    nextModule: 0
};
const SEED_USERS = [SEED_ADMIN, SEED_SUPERVISOR, SEED_USER, SEED_USER2];
const SEED_ROLES = ['user', 'supervisor', 'admin']

export function insertSeedData(){
    const assignments = Assessments.find({}).fetch().map(x => { return { assignment: x["_id"], type: "assessment" } });
    assignments.concat(Modules.find({}).fetch().map(x => { return { assignment: x["_id"], type: "module" } }));
    console.log(assignments);
    //create seed roles
    for(let role of SEED_ROLES){
        if(!Meteor.roles.findOne({ '_id' : role })){
            Roles.createRole(role);
        }
    }
    let newOrgId;
    //create seed user
    for(let user of SEED_USERS){
        if (!Accounts.findUserByUsername(user.username)) {
            const uid = Accounts.createUser({
                username: user.username,
                password: user.password,
                email: user.email,
            });
            
            addUserToRoles(uid, user.role);
            if(user.role == "admin"){
                Orgs.insert({
                    orgName: "IIS",
                    orgOwnerId: uid,
                    orgDesc: "Testing",
                    newUserAssignments: assignments
                });
                newOrgId = Orgs.findOne({orgOwnerId: uid})._id;
                const d = new Date();
                let month = d.getMonth(); 
                let day = d.getDate();
                let year = d.getFullYear();
                let title = "test event";
                Events.insert({
                    type: "org",
                    org: newOrgId,
                    month: month,
                    day: day,
                    year: year,
                    title: title,
                    createdBy: uid
                });
                Meteor.call('generateInvite',uid);
            }

            let supervisorID = '';
            if(user.role == 'user'){
                supervisorID =  Accounts.findUserByUsername(SEED_SUPERVISOR.username)._id;
            }
            Meteor.users.update({ _id: uid }, 
                {   $set:
                    {
                        sex: user.sex,
                        firstname: user.firstName,
                        lastname: user.lastName,
                        supervisor: supervisorID,
                        organization: newOrgId,
                        sex: user.sex,
                        assigned: user.assigned || assignments,
                        hasCompletedFirstAssessment: user.hasCompletedFirstAssessment,
                        nextModule: 0,
                        author: true
                    }
                }
            );
            if(user.role == 'admin' || user.role == 'supervisor'){
                Meteor.call("generateApiToken", uid)
            }
        }
    }
}