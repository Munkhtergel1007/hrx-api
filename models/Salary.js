let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);
let SalarySchema = mongoose.Schema({
    company: {type: ObjectId, ref: 'Company'},
    employee: {emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}},
    initial_salary: {type: Number, default:0},
    year_month: {type:Date}, //we will use year and month
    status:{type:String, enum:['idle', 'pending', 'approved', 'declined', 'deleted'], default: 'idle'},
    created: {type:Date, default: Date.now},
    add:[ {
        amount: {type: Number, default:0},
        type: {type: String, enum: ['busad', 'nemegdel', 'uramshuulal', 'iluu_tsagiin_huls']},
        description: {type:String},
    }],
    sub: [{
        amount: {type: Number, default:0},
        type: {type: String, enum: ['busad', 'n_d_sh', 'h_h_o_a_t', 'hotsrolt', 'taslalt']},
        description: {type:String},
    }],
    hungulult: {type: Number, default: 0},
    hool_unaanii_mungu: {type: Number, default: 0},
});
SalarySchema.plugin(deepPopulate, {
    whitelist: [],
    populate: {
    }
});
module.exports = mongoose.model('Salary', SalarySchema);