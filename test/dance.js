
db.dance.drop();

for (var idx=0; idx < 100; idx++) {
    db.dance.findOne();
    db.dance.insert({n: 't'});
    db.dance.update({x: 1}, {n: 'u'});
    db.dance.remove({n: 't'});
};

for (var idx=0; idx < 30000; idx++) db.dance.findOne();

for (var idx=0; idx < 30000; idx++) db.dance.insert({n: 't'});

for (var idx=0; idx < 100; idx++) db.dance.update({x: 1}, {n: 'u'});

for (var idx=0; idx < 30000; idx++) db.dance.remove({n: 't'});

db.dance.drop();

