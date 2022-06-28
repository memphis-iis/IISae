//Iron Router Api
Router.route('/api',{
    where: "server",
    action: function (){
        this.response.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        username = this.request.headers['x-user-id'];
        loginToken = this.request.headers['x-auth-token'];
        user = Meteor.users.findOne({username: username});
        isTokenExpired = true;
        keys = user.api;
        now = new Date();
        expDate = keys.expires;
        expDate.setDate(expDate.getDate())
        if(now < expDate){
            isTokenExpired = false;
        }
        if(!user || user.api.token != loginToken || isTokenExpired == true){
            this.response.end("{sucess: false, message: 'incorrect username or expired token'}");
        } else {
            organization = Orgs.findOne({orgOwnerId: user._id});
            userlist = Meteor.users.find({organization: organization._id}, {
                fields: {
                    firstname: 0,
                    lastname: 0,
                    emails: 0,
                    username: 0,
                    services: 0,
                    organization: 0,
                    api: 0
                },
            }).fetch();
            userListResponse = []
            for(i = 0; i < userlist.length; i++){
                userModules = ModuleResults.find({userId: userlist[i]._id}).fetch();
                curUser = userlist[i];
                curUser.modules = JSON.parse(JSON.stringify(userModules));
                userListResponse.push(curUser);
            }
            organization.users = userListResponse;
            this.response.end(JSON.stringify(organization));
        }
    }
});