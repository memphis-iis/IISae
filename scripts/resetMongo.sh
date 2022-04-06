#! /bin/sh
mongo issae --eval "db.organizations.remove({}); db.roles.remove({}); db.users.remove({}); db.getCollection('role-assignment').remove({})"
