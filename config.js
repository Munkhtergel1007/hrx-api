import User from "./models/User";

const winston = require('winston');
let actions = require('./hrx_actions.json');
import mongoose from "mongoose";
let config = {};
let configList = {
    register_id_regex: /^[а-яА-Яa-zA-ZөӨүҮёЁ]{2}[0-9]{8}$/,
    name_regex: /^[a-zA-Zа-яА-ЯөӨүҮёЁ-]*$/,
    phone_regex: /^[0-9]{8}$/,
    email_regex: /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    username_regex: /^[0-9a-zA-Z_]*$/,
    domain_regex: /^[a-zA-Z0-9]*$/,
};
config.config = function (data) {
    configList = {
        ...configList,
        ...data
    }
};
config.get = function (option) {
    return configList[option];
};
module.exports = {
    config,
    domain:'https://tatatunga.mn',
    local_domain:'http://hrx.com',
    jwt_secret:'KDrL5JEaHklA3e9TjJSNaZXQGapZTRZh',
    actions: actions,
    isId: function(id){
        // let checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");
        // return checkForHexRegExp.test(id) ? id : null;
        return mongoose.Types.ObjectId.isValid(id) ? id : null;
    },
    isValidDate: function(dateObject){
        return (new Date(dateObject).toString() !== 'Invalid Date') ? dateObject : null;
    },
    winsErr: function(req = {}, err, func = ''){
        return winston.error(req.originalUrl + `    ---->    ${func}`, err);
    },
    string: function(string){
        return String(string).replace(/(<([^>]+)>)/gi, "").replace('undefined', '').replace('null', '');
    },
    bool: function(variable){
        return (typeof variable !== 'boolean' ? false : variable);
    },
    actionsArray: function () {
        let keys = Object.keys(actions);
        return keys.map((c) => {
            return {key: c, value: actions[c]};
        });
    },
    actionsKeys: function () {
        return Object.keys(actions);
    },
    isPhoneNum: function(str){
        let phone = String(str).replace(/\+976|\+7|-|_|\n|\s/g, '');
        return configList.phone_regex.test(phone) ? phone : null;
    },
    getDatesBetweenDates: function(startDate, endDate){
        let dates = [];
        const theDate = new Date(startDate);
        while (theDate < endDate) {
            dates = [...dates, new Date(theDate.toDateString())];
            theDate.setDate(theDate.getDate() + 1)
        }
        return dates
    },
    checkIfDayInGap: function(date, days=[]){
        let check = false;
        if(date && days && days.length > 0){
            let convertedDate = new Date(date.toString());
            (days || []).map(function (r) {
                let dat = new Date(r);
                // if((new Date(r.toDateString()) || 'aa').toString() === (new Date(date.toDateString()) || 'bb').toString()){
                if(dat.getFullYear() === convertedDate.getFullYear() && dat.getMonth() === convertedDate.getMonth() && dat.getDate() === convertedDate.getDate()){
                    check = true;
                }
            });
        }
        return check
    },
    dayToNumber: function(day=''){
        switch (day.toLowerCase()) {
            case 'monday':      return 1;
            case 'tuesday':     return 2;
            case 'wednesday':   return 3;
            case 'thursday':    return 4;
            case 'friday':      return 5;
            case 'saturday':    return 6;
            case 'sunday':      return 7;
            default: return 0;
        }
    },
    companyAdministrator: function(resEmployee){
        let employee = (resEmployee || {});
        let hadAction = (employee.staticRole === 'lord' || employee.staticRole === 'hrManager' || employee.staticRole === 'chairman')
        return (
            hadAction
        );
    },
    companyLord: function(resEmployee){
        let employee = (resEmployee || {});
        let hadAction = employee.staticRole === 'lord';
        return (
            hadAction
        );
    },
    companyHrManager: function(resEmployee){
        let employee = (resEmployee || {});
        let hadAction = employee.staticRole === 'hrManager';
        return (
            hadAction
        );
    }
};