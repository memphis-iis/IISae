#! /bin/sh
mongo issae --eval "db.assessments.remove({}); db.organizations.remove({}); db.roles.remove({}); db.trials.remove({}); db.users.remove({}); db.getCollection('role-assignment').remove({})"
