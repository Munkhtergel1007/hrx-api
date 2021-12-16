let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);

// Ээлжийн амралт
const Vacation = mongoose.Schema({
    employee: {emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}},
    company: {type: ObjectId, ref: 'Company'},
    starting_date: {type:Date},
    ending_date: {type:Date},
    approved_on: {type:Date}, // approved bolson ognoo
    approved_by: {emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}}, //zuvshuursu hunii id
    created_by: {type: ObjectId, ref: 'Employee'}, //tohirgoon deer oruulsan hunii id
    created: {type: Date, default: Date.now},
    status:{type:String, enum:['idle', 'pending', 'amrahgui', 'approved', 'declined', 'deleted'], default: 'idle'}, //tohirgoon deer uusgesen uyd idle, ajiltan amrah udruu songoson uyd pending
    selected_dates:[{type:Date}], //ajiltnii songoson udruud
});


Vacation.plugin(deepPopulate, {
    whitelist: ['employee.emp', 'employee.user', 'company', 'approved_by.emp', 'approved_by.user'],
    populate: {
        'employee.emp': {
            select: '_id staticRole'
        },
        'employee.user': {
            select: '_id last_name first_name'
        },
        'approved_by.emp':{
            select:'_id staticRole'
        },
        'approved_by.user':{
            select:'_id first_name last_name'
        },
        'company':{
            select:'_id domain name phone email logo'
        },
    }
});


module.exports = mongoose.model('Vacation', Vacation);