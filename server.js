import path from "path";
import mongoose from 'mongoose';
import winston from 'winston';
const env = process.env.NODE_ENV;
import useragent from "express-useragent";
import cookieParser from "cookie-parser";
import bodyparser from "body-parser";
import cors from "cors";
import Admin from "./models/Admin";
import User from "./models/User";
import express from "express";
import config from "./config";
import jwt from "jsonwebtoken";
import session from "express-session";
import Company from "./models/Company";
import Employee from "./models/Employee";
import Reference from "./models/Reference";
import MassAttendance from "./models/MassAttendance";
import CompanyTransaction from "./models/Company_Transaction";
import Category from "./models/Category";
import Roles from "./models/Roles";
import Media from "./models/Media";
import async from 'async';
import psl from "psl";
import NodeCache from "node-cache";
import jsonwebtoken from 'jsonwebtoken';
import { isId, winsErr } from './config';
const myCache = new NodeCache({deleteOnExpire: false});
const SocketIo = require('socket.io');
const redis = require('socket.io-redis');
import cnf, {config as lang} from './lang';

const app = express();
let sda = app.listen('8091',function (err) {
    if(err){
        winston.error('app start error');
        winston.error(err);
        process.exit(1)
    }else{
        winston.info('app started port: %s', '8091')
    }
});
const io = SocketIo(sda, {path: '/api/socket' , secure : true , rejectUnauthorized: false});

var cron = require('node-cron');
cron.schedule('0 2 * * *', () => {
    if((process.env || {}).pm_id === '223' &&  (process.env || {}).name === 'hrx') {
        let date = new Date();
        Company.find({status: 'active'}).lean().exec(function (err, com) {
            if (err) {
                winston.error('cron massAttendance company.find()', err);
            }
            async.map((com || []), function (item, callback) {
                Employee.find({
                    status: {$nin: ['fired', 'delete']},
                    company: item._id
                }).lean().exec(function (err, emp) {
                    if (err) {
                        winston.error('cron massAttendance Employee.find()', err);
                    }
                    callback(err, {
                        ...item,
                        employees: emp
                    });
                });
            }, function (err, result) {
                if (err) {
                    winston.error('cron massAttendance Employee.find() 2', err);
                }
                let saveAllData = [];
                (result || []).map(r => (r.employees || []).map(function (eachEmp) {
                    let saveSingleData = {
                        company: eachEmp.company,
                        employee: eachEmp._id,
                        user: eachEmp.user,
                        status: 'default',
                        timetable: eachEmp.timetable,
                        localTime: date
                    };
                    saveAllData.push(saveSingleData);
                }));
                MassAttendance.insertMany(saveAllData, function (err, exDone) {
                    if (err) {
                        winston.error('cron massAttendance MassAttendance.insertMany()', err);
                    }
                });
                // MassAttendance.remove({status:'default'}, function (err, exDone) {
                //     if(err){winston.error('cron massAttendance MassAttendance.insertMany()', err);}
                // });
            });
        });
    }
});
io.set('transports', [
    'websocket',
    //'polling'
]);
if(process.env.NODE_ENV !== 'development') {
    io.adapter(redis({key:'hrx', host: 'localhost', port: 6379 }));
}
io.set('browser client gzip', true);
io.set('browser client minification', true);
io.set('browser client etag', true);
app.use(function(req, res, next) {
    req.io = io;
    next();
});
var configServer = {
    mongoUrl:'mongodb://127.0.0.1:27017/hrx',
    option: {
        "auth": { "authSource": "admin" },
        "user": "amjilt",
        "pass": "shijircom",
        "useMongoClient": true
    },
    logPath:path.resolve(__dirname,"logs")
};
app.use(session({
    resave: false,
    saveUninitialized: true,
    secret: 'hrx',
    cookie: { httpOnly: false, domain: process.env.NODE_ENV === 'development' ? `.hrx.com` : `.tatatunga.mn`}
}));
app.use(useragent.express());
app.use(cookieParser());
app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());
app.set('view engine', 'pug');
app.set('views', path.resolve(__dirname,'../views'));
app.use('/', express.static(path.join(__dirname, '../hrx_react', 'static')));

winston.add(winston.transports.File, { filename: configServer.logPath+'/info.log', name: 'info-file',
    level: 'info'});
winston.add(winston.transports.File, { filename: configServer.logPath+'/error.log', name: 'error-file',
    level: 'error'});
app.use(cors());
app.set('view options', { charset: 'UTF-8' });

/*
* Check user and token
* */
app.use('/*', function(req, res, next){
    // if(req.query && req.query.SN === 'BR5U212560035'){
    //     console.log('huuy huuy', req.query);
    // }
    let token = req.body.token || req.query.token || req.headers['token'] || req.cookies.token;
    let hostname = req.hostname;
    let parsed = psl.parse(hostname);
    let subdomain = parsed.subdomain;
    req.domain = parsed.domain || 'tatatunga.mn';
    req.subdomain = String(subdomain || null);
    // console.log('out',req.domain);
    if(req.domain && (req.domain.toLowerCase() === 'tapsir.com' || req.domain.toLowerCase() === 'tapsir.mn')){
        // console.log('in',req.domain);
        cnf.config({lang : req.cookies.lang && req.cookies.lang !== 'mn' ? req.cookies.lang : 'kz'});
        // config.config.config({register_id_regex: /^[0-9]{10}$/});
        // config.config.config({name_regex: /^[а-яА-ЯёЁa-zA-Z\u04D8\u04D9\u04B0\u04B1\u0406\u0456\u04A2\u04A3\u0492\u0493\u04AE\u04AF\u049A\u049B\u04E8\u04E9\u04BA\u04BB]*$/});
        // config.config.config({phone_regex: /^[0-9]{10}$/});
        req.register_id_regex = /^[0-9]{10}$/;
        req.name_regex = /^[а-яА-ЯёЁa-zA-Z\u04D8\u04D9\u04B0\u04B1\u0406\u0456\u04A2\u04A3\u0492\u0493\u04AE\u04AF\u049A\u049B\u04E8\u04E9\u04BA\u04BB]*$/;
        req.phone_regex = /^[0-9]{10}$/;
        // Cookies.set('lang' , Cookies.get('lang') && Cookies.get('lang') !=='mn' ? Cookies.get('lang') : 'kz');
        // lang({lang : Cookies.get('lang') && Cookies.get('lang') !=='mn' ? Cookies.get('lang') : 'kz'});
    } else {
        cnf.config({lang : 'mn'});
        // Cookies.set('lang' , 'mn');
        // lang({lang : 'mn'});

        req.register_id_regex = /^[а-яА-Яa-zA-ZөӨүҮёЁ]{2}[0-9]{8}$/;
        req.name_regex = /^[a-zA-Zа-яА-ЯөӨүҮёЁ-]*$/;
        req.phone_regex = /^[0-9]{8}$/;
    }
    if (token) {
        jsonwebtoken.verify(token, 'KDrL5JEaHklA3e9TjJSNaZXQGapZTRZh', function (err, decoded) {
            if (err) {
                next();
            } else {
                User.findOne({_id: decoded.id}, {password: 0}).deepPopulate('avatar').lean().exec(function (err, user) {
                    if(user){
                        req.user = user;
                        let token = jwt.sign({
                            id: user._id,
                        }, 'KDrL5JEaHklA3e9TjJSNaZXQGapZTRZh', {
                            expiresIn: req.headers['isapp'] === 'yes' ? 86400000 : 60*60*24
                        });
                        let tokenConf = { hostOnly:false,domain:`.${req.domain}` };
                        tokenConf = {...tokenConf, maxAge: 86400000};
                        res.cookie('token',token, tokenConf);
                        next();
                    } else {
                        next();
                    }
                });
            }
        });
    } else {
        next();
    }
});

/*
* Check company, employee and filesize
* */
app.use('/*', function(req, res, next){
    let protocol = process.env.NODE_ENV === 'development' ? 'http://' : 'https://';
    // let hostname = req.hostname;
    // let parsed = psl.parse(hostname);
    // let subdomain = parsed.subdomain;
    // req.domain = parsed.domain || 'tatatunga.mn';
    // req.subdomain = String(subdomain || null);
    if(
        req.subdomain !== 'www' && req.subdomain !== '0' && req.subdomain !== 'null' && req.subdomain !== 'undefined'
    ){
        Company.findOne({domain: req.subdomain, status: 'active'}, {slider: 0, status: 0}).deepPopulate(['logo', 'cover']).lean().exec(function(err, company){
            if(company){
                req.company = company;
                Employee.findOne({
                    company: company._id,
                    user: (req.user || {})._id,
                    $or: [
                            {status: {$eq: 'active'}},
                    ]
                }).sort({created: -1}).deepPopulate('role').lean().exec(function(err, emps){
                    if(err){winsErr(req, err, 'Employee.findOne()');}
                    if(emps){
                        Reference.find({status:'pending', 'written_by.emp':emps._id}, {status: 0}).deepPopulate(['employee.emp', 'employee.user']).exec(function (err, references) {
                            if(err){winsErr(req, err, 'Reference.find() ---> notf');}
                            req.references = references || [];
                            req.employee = emps;
                            let actions = ['create_subsidary', 'read_subsidary'];
                            let hadAction = actions.length > 0 ? (((req.employee || {}).role || {}).actions || []).some((c) => actions.indexOf(c) > -1) : true;
                            let hasAccess = ((req.employee || {}).staticRole === 'lord' || (req.employee || {}).staticRole === 'hrManager' || (req.employee || {}).staticRole === 'chairman')
                                || (req.employee || {}).staticRole === 'attendanceCollector' || hadAction;
                            if(hasAccess){
                                Company.find({parent: company._id, status: 'active'}).lean().exec(function(err, companies){
                                    if(err){winsErr(req, err, 'Company.find() ---> hasAccess');}
                                    req.subsidiaries = companies.map((c) => c._id);
                                    next();
                                });
                            } else {
                                next();
                            }
                        })
                    } else {
                        req.employee = null;
                        next();
                    }
                });
            } else {
                req.company = null;
                return res.redirect(protocol + req.domain);
            }
        });
    } else {
        Employee.find({ user: (req.user || {})._id, status: 'active' }).lean().exec(function(err, emp){
            if(err){
                winston.error('/* Employee.findOne()', err);
                // return res.status(200).json({success:false, msg: 'Системийн алдаа 1'});
            } else
            if(emp && emp.length>0){
                Company.find({ _id: {$in: emp.map(r => r.company)}, status: {$in:['active', 'pending']} }).deepPopulate(['logo']).lean().exec(function(err, comp){
                    if(err){
                        winston.error('/* Company.findOne()', err);
                        // return res.status(200).json({success:false, msg: 'Системийн алдаа 2'});
                    }
                    if(comp && comp.length>0){
                        req.employees = emp;
                        req.companies = comp.map(r => r.status === 'active' ? r : null).filter(r => r);
                        req.pendingCompanies = comp.map(r => r.status === 'pending' ? r : null).filter(r => r);
                        next();
                    } else {
                        req.employees = emp;
                        next();
                    }
                });
            } else {
                next();
            }
        });
    }
});

/*
* Check admin
* */
app.use(['/api/admin/*', '/admin/*', '/admin'], function(req, res, next){
    let protocol = env === 'development' ? 'http' : 'https';
    let hostname = req.hostname;
    let parsed = psl.parse(hostname);
    req.domain = parsed.domain || 'tatatunga.mn';
    req.proto = protocol || 'https';
    let token = req.body.token || req.query.token || req.headers['token'] || req.cookies.token;
    if (token) {
        jwt.verify(token, config.jwt_secret, function (err, decoded) {
            if (err) {
                winston.error(err);
                req.session.destroy();
                res.clearCookie('token', { domain: `.${req.domain}` });
                next();
            } else {
                Admin.findOne({_id: decoded.id}, {password:0}).lean().exec(function (err, user) {
                    req.admin = user;
                    next();
                });
            }
        });
    } else {
        next();
    }
});

const adminRouter = express.Router();
require('./routers/admin')(adminRouter);
app.use(adminRouter);

const merchantRouter = express.Router();
require('./routers/company')(merchantRouter);
app.use(merchantRouter);

const webRouter = express.Router();
require('./routers')(webRouter);
app.use(webRouter);

if(env === 'development') {
    mongoose.connect("mongodb://localhost:27017/hrx");
} else {
    mongoose.connect(configServer.mongoUrl, configServer.option);
}
mongoose.connection.on('open', function (ref) {
    winston.info('db connected');
});
mongoose.connection.on('error',function (error) {
    winston.error('db connection error:', error);
});