import express from "express";
import { application, checklist, deleteFileToCloudinary, getAllApplications, getDashboard, getFreshApplications, getList, getRenewalApplications, login, logout, myapplication, newUser, renewal, sendNotification, updateStatus } from "../controller/user.controller.js"; 
import { isAuthenticated } from "../middleware/auth.middleware.js";
import { upload } from '../utils/multer.js';

const app = express.Router();

app.post("/new", newUser);
app.post("/login", login);

app.use(isAuthenticated);

app.get("/me", getDashboard); 
app.get("/logout", logout);

app.post("/application", upload.fields([
    { name: 'approvedPlan', maxCount: 1 },
    { name: 'occupationCertificate', maxCount: 1 },
    { name: 'registrationCertificate', maxCount: 1 },
    { name: 'complianceCertificate', maxCount: 1 },
    { name: 'architectPlan', maxCount: 1 },
    { name: 'areaCertificate', maxCount: 1 },
    { name: 'buildingNOC', maxCount: 1 }
]), application);

app.post("/renewal", upload.fields([
    { name: 'applicationForm', maxCount: 1 },
    { name: 'selfDeclaration', maxCount: 1 },
    { name: 'fireExtinguisherRegister', maxCount: 1 },
    { name: 'fireFightingPhotos', maxCount: 1 },
    { name: 'maintenanceCertificateOwner', maxCount: 1 },
    { name: 'maintenanceCertificateContractor', maxCount: 1 },
    { name: 'fireNoc', maxCount: 1 }
]), renewal);

app.get("/applicationlist", getAllApplications);
app.get("/freshlist", getFreshApplications);
app.get("/renewallist", getRenewalApplications);

app.put("/updateStatus", updateStatus);
app.get("/send-notification", sendNotification);
app.post("/checklist", checklist);
app.get("/getlist", getList);
app.get("/myapplication", myapplication);
app.post("/delete", deleteFileToCloudinary);

export default app;
