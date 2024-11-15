import bcrypt from "bcryptjs";
const { compare } = bcrypt;
import User from "../model/user.model.js";
import { sendToken, uploadFilesToCloudinary} from "../utils/features.js";
import {TryCatch} from "../middleware/error.js";
import {ErrorHandler} from "../utils/utility.js";
import cloudinary from "cloudinary";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import Checklist from "../model/checklist.model.js";
import PDFDocument from "pdfkit";
import fs from "fs";
dotenv.config();

const newUser = TryCatch(async (req, res, next) => {
  const { username, email, password, role } = req.body;

  const allowedRoles = ["inspector", "applicant"];
  if (!allowedRoles.includes(role)) {
    return next(new ErrorHandler("Invalid role provided", 400));
  }

  const user = await User.create({
    username,
    email,
    password,
    role
  });

  sendToken(res, user, 201, "User created");

  if (!user) {
    return next(new ErrorHandler("User not created", 400));
  }

  const newChecklist = new Checklist({
    email,
  });

  await newChecklist.save();

});

const login = TryCatch(async (req, res, next) => {
  const { email, password, role } = req.body;

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(new ErrorHandler("User not exist", 404));
  }

  if(user.role !== role){
    return next(new ErrorHandler("Incorrect role for this user", 403));
  }

  const isMatch = await compare(password, user.password);

  if (!isMatch) return next(new ErrorHandler("Invalid email or Password", 404));

  // Include role information in the login response if needed
  sendToken(res, user, 200, `Welcome Back, ${user.username} (${user.role})`);

});

const logout = TryCatch(async(req, res) => {
    res.status(200).json({
        success: true,
        message: "Logged out successfully",
    });

});

const getDashboard = TryCatch(async(req, res) => {
  const user =  await User.findById(req.user);
    res.status(200).json({
        success: true,
        user,
    }); 
});

const application = TryCatch(async (req, res) => {
  const user = await User.findById(req.user);

  if (user.applicationCount > 0) {
    return res.status(400).json({ message: 'Application already submitted. Please wait for inspector approval.' });
  }

  try {
    const requiredFiles = [
      'approvedPlan',
      'occupationCertificate',
      'registrationCertificate',
      'complianceCertificate',
      'architectPlan',
      'areaCertificate',
      'buildingNOC',
    ];

    const filesToUpload = requiredFiles.map((field) => {
      const file = req.files[field] ? req.files[field][0] : null;
      if (!file) {
        console.warn(`No file found for ${field}`);
      }
      return file;
    }).filter(Boolean); 

    if (filesToUpload.length === 0) {
      return res.status(400).json({ message: 'No files uploaded. Please upload the required documents.' });
    }

    const uploadedFiles = await uploadFilesToCloudinary(filesToUpload, `${user?.email}/fresh_application`);
    

    const applicationData = { files: {} };  
    uploadedFiles.forEach((file, index) => {
      applicationData.files[requiredFiles[index]] = file.url; 
    });

    user.applicationCount += 1;
    await user.save();

    res.status(200).json({ message: 'Application submitted successfully.', data: applicationData });
  } catch (error) {
    console.error('Error during file upload:', error);
    res.status(500).json({ message: 'An error occurred while submitting the application.' });
  }
});

const renewal = TryCatch(async (req, res) => {
  const user = await User.findById(req.user);

  if (user.renewalCount > 0) {
    return res.status(400).json({ message: 'Renewal already submitted. Please wait for inspector approval.' });
  }

  try {
    const requiredFiles = [
      'applicationForm',
      'selfDeclaration',
      'fireExtinguisherRegister',
      'fireFightingPhotos',
      'maintenanceCertificateOwner',
      'maintenanceCertificateContractor',
      'fireNoc',
    ];

    const filesToUpload = requiredFiles.map((field) => {
      const file = req.files[field] ? req.files[field][0] : null;
      if (!file) {
        console.warn(`No file found for ${field}`);
      }
      return file;
    }).filter(Boolean); 

    if (filesToUpload.length === 0) {
      return res.status(400).json({ message: 'No files uploaded. Please upload the required documents.' });
    }

    const uploadedFiles = await uploadFilesToCloudinary(filesToUpload, `${user?.email}/renewal_application`);

    const applicationData = {
      applicationForm: uploadedFiles[0].url, 
      selfDeclaration: uploadedFiles[1].url,
      fireExtinguisherRegister: uploadedFiles[2].url,
      fireFightingPhotos: uploadedFiles[3] ? uploadedFiles[3].url : [],
      maintenanceCertificateOwner: uploadedFiles[4].url,
      maintenanceCertificateContractor: uploadedFiles[5].url,
      fireNoc: uploadedFiles[6].url,
    };

    user.renewalCount += 1;
    await user.save();

    res.status(200).json({ message: 'Renewal application submitted successfully.', data: applicationData });

  } catch (error) {
    console.error('Error during renewal application upload:', error);
    res.status(500).json({ message: 'An error occurred while submitting the renewal application.' });
  }
});

const getAllApplications = TryCatch( async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const users = await User.find({ role: { $ne: 'inspector' } }).skip(skip).limit(limit);
    // console.log("Users found:", users);
    const userDataPromises = users.map(async (currentUser) => {
      const userEmail = currentUser.email;
      const documentsFolder = `user_uploads/${userEmail}`;
      try {
        
        const cloudinaryResult = await cloudinary.api.resources_by_asset_folder(documentsFolder);

        const documents = cloudinaryResult.resources
        .filter(resource => resource.public_id.startsWith(documentsFolder))
        .map(resource => ({
          public_id: resource.public_id,
          url: resource.secure_url,
        }));

        return {
          username: currentUser.username,
          email: userEmail,
          role: currentUser.role,
          applicationStatus: currentUser.status || 'Pending',
          isCheckListDone: currentUser.isCheckListDone,
          documentsFolderUrl: `https://res.cloudinary.com/your_cloud_name/${documentsFolder}`,
          documents,
        };
      } catch (error) {
        // console.error("Error fetching documents from Cloudinary:", error.message);
        return {
          username: currentUser.username,
          email: userEmail,
          role: currentUser.role,
          applicationStatus: currentUser.applicationStatus || 'Pending',
          isCheckListDone: currentUser.isCheckListDone,
          documentsFolderUrl: `https://res.cloudinary.com/your_cloud_name/${documentsFolder}`,
          documents: [],
          error: error.message,
        };
      }
    });

    const usersData = await Promise.all(userDataPromises);
    res.status(200).json(usersData);
  } catch (error) {
    console.error("Error fetching users:", error.message); 
    res.status(500).json({ error: error.message });
  }
});

const getFreshApplications = TryCatch(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const users = await User.find({
      role: { $ne: 'inspector' },
      applicationCount: { $gt: 0 }
    }).skip(skip).limit(limit);

    if(!users){
      return res.status(404).json({ message: 'No fresh applications found' });
    }
    
    const userDataPromises = users.map(async (currentUser) => {
      const userEmail = currentUser.email;
      const documentsFolder = `user_uploads/${userEmail}/fresh_application`;

      try {
        const cloudinaryResult = await cloudinary.api.resources_by_asset_folder(documentsFolder);

        const documents = cloudinaryResult.resources.map(resource => ({
          public_id: resource.public_id,
          url: resource.secure_url,
        }));

        return {
          username: currentUser.username,
          email: userEmail,
          role: currentUser.role,
          applicationStatus: currentUser.status || 'Pending',
          isCheckListDone: currentUser.isCheckListDone,
          documents,
        };
      } catch (error) {
        //console.error("Error fetching fresh application documents:", error);
        return {
          username: currentUser.username,
          email: userEmail,
          role: currentUser.role,
          applicationStatus: currentUser.status || 'Pending',
          isCheckListDone: currentUser.isCheckListDone,
          documents: [],
          error: error.message,
        };
      }
    });

    const usersData = await Promise.all(userDataPromises);
    res.status(200).json(usersData);
  } catch (error) {
    console.error("Error fetching fresh applications:", error.message);
    res.status(500).json({ error: error.message });
  }
});

const getRenewalApplications = TryCatch(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const users = await User.find({
      role: { $ne: 'inspector' },
      renewalCount: { $gt: 0 }
    }).skip(skip).limit(limit);

    if(!users){
      return res.status(404).json({ message: 'No renewal applications found' });
    }

    const userDataPromises = users.map(async (currentUser) => {
      const userEmail = currentUser.email;
      const documentsFolder = `user_uploads/${userEmail}/renewal_application`;

      try {
        const cloudinaryResult = await cloudinary.api.resources_by_asset_folder(documentsFolder);

        const documents = cloudinaryResult.resources.map(resource => ({
          public_id: resource.public_id,
          url: resource.secure_url,
        }));

        return {
          username: currentUser.username,
          email: userEmail,
          role: currentUser.role,
          applicationStatus: currentUser.status || 'Pending',
          isCheckListDone: currentUser.isCheckListDone,
          documents,
        };
      } catch (error) {
        console.error("Error fetching renewal application documents:", error.message);
        return {
          username: currentUser.username,
          email: userEmail,
          role: currentUser.role,
          applicationStatus: currentUser.status || 'Pending',
          isCheckListDone: currentUser.isCheckListDone,
          documents: [],
          error: error.message,
        };
      }
    });

    const usersData = await Promise.all(userDataPromises);
    res.status(200).json(usersData);
  } catch (error) {
    console.error("Error fetching renewal applications:", error.message);
    res.status(500).json({ error: error.message });
  }
});

const updateStatus = TryCatch(async (req, res, next) => {
  const { email, applicationStatus } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  if (applicationStatus === "Approved" && !user.isCheckListDone) {
    return next(new ErrorHandler("Cannot approve application. Checklist is not completed.", 400));
  }

  user.status = applicationStatus;

  if (applicationStatus === 'Approved' || applicationStatus === 'Rejected') {
    user.applicationCount = 0;
    user.renewalCount = 0;

    try {
      if (applicationStatus === 'Approved') {
        const pdfPath = await generateFireNOC(user);

        await statusNotify(user, applicationStatus, pdfPath);
      } else {
        await statusNotify(user, applicationStatus, null);
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      return next(new ErrorHandler("Error sending notification", 500));
    }
  }

  await user.save();
  res.status(200).json({
    success: true,
    message: "Status updated and counts reset successfully",
  });
});

const generateFireNOC = async (user) => {
  const pdfPath = `./FireNOC_${user.email}.pdf`;
  console.log(`Generating PDF at path: ${pdfPath}`);  

  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(pdfPath));

  // Title - Fire NOC Certificate
  doc.fontSize(24).font('Helvetica-Bold').text("Government of [Your Country/Region]", { align: 'center' });
  doc.fontSize(30).font('Helvetica-Bold').text("Fire No Objection Certificate (NOC)", { align: 'center' });
  doc.moveDown(2);
  
  // Date and Address Section
  doc.fontSize(12).font('Helvetica').text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' });
  doc.moveDown();
  doc.text(`Address: [Government Department Address]`, { align: 'right' });
  doc.moveDown(1);
  
  // Recipient Details
  doc.fontSize(14).font('Helvetica-Bold').text("Certificate Holder:", { align: 'left' });
  doc.fontSize(12).font('Helvetica').text(`${user.name}`, { align: 'left' });
  doc.fontSize(12).text(`Email: ${user.email}`, { align: 'left' });
  doc.moveDown(1);
  
  // Body of the Certificate
  doc.fontSize(12).font('Helvetica').text("This is to certify that the Fire Safety measures for the property owned by the aforementioned individual have been reviewed and approved by the [Relevant Authority] as per the applicable fire safety laws and regulations.", { align: 'justify' });
  doc.moveDown();
  
  doc.text("The following fire safety measures have been implemented and found to be satisfactory:", { align: 'justify' });
  doc.moveDown();
  
  doc.fontSize(12).list([
    'Fire Alarm Systems: Installed and operational.',
    'Fire Extinguishers: Properly installed at strategic locations.',
    'Exit Routes: Clearly marked and unobstructed.',
    'Emergency Lighting: Installed and operational.',
    'Fire Drills: Conducted regularly and documented.'
  ]);
  doc.moveDown();
  
  // Certification Statement
  doc.fontSize(12).font('Helvetica').text("This Fire NOC is issued under the authority of the Fire Safety Compliance Act and is valid until [Expiration Date].", { align: 'justify' });
  doc.moveDown();
  
  // Conclusion and Signature Block
  doc.text("Congratulations on successfully meeting all required fire safety standards.", { align: 'center' });
  doc.moveDown(2);
  
  doc.text("Issued By:", { align: 'left' });
  doc.text("[Issuing Authority Name]", { align: 'left' });
  doc.text("[Department Name]", { align: 'left' });
  doc.moveDown();
  
  doc.fontSize(12).font('Helvetica').text("Signature:", { align: 'left' });
  doc.moveDown(1);
  doc.text("[Signature of Authorized Person]");
  
  doc.end();

  return pdfPath;
};


const statusNotify = TryCatch(async (user, applicationStatus, pdfPath) => {
  const { email } = user;
  let message = '';
  let subject = '';
  let attachments = [];

  if (applicationStatus === 'Approved') {
    message = `
      <p>Congratulations!</p>
      <p>Your application has been approved. All safety measures have been successfully reviewed and passed.</p>
      <p>Please find your Fire NOC certificate attached below.</p>
    `;
    subject = 'Application Approved';

    if (pdfPath) {
      attachments.push({
        filename: `FireNOC_${user.email}.pdf`,
        path: pdfPath,
      });
    }
  } else if (applicationStatus === 'Rejected') {
    message = `
      <p>We regret to inform you that your application has been rejected.</p>
      <p>Please review your application and submit the necessary corrections.</p>
    `;
    subject = 'Application Rejected';
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: false,
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: {
      name: "NOC App",
      address: process.env.EMAIL,
    },
    to: email,
    subject: subject,
    html: message,
    attachments: attachments, 
  };

  await transporter.sendMail(mailOptions);
  console.log("Email notification sent successfully");
});


const sendNotification = TryCatch(async (req, res) => {
  const { email, missingItems } = req.query;
  const user = await User.findOne({ email });

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 465,
      secure: false, 
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    let message;
    if (user.isCheckListDone) {
      message = `
        <p>Your application approval is in progress.</p>
        <p>Your all Safety Measurements are Checked!</p>
      `;
    } else {
      message = `
        <p>Here is some Missing Safety Mesurements at Your Property:</p>
        <ul>
          ${missingItems.map(item => `<li><strong>${item}</strong></li>`).join('')}
        </ul>
      `;
    }

    const mailOptions = {
      from: {
        name: "NOC App",
        address: process.env.EMAIL,
      },
      to: email,
      subject: user.isCheckListDone ? "Application Approval In Progress" : "Checklist Incomplete",
      html: message,
    };

    await transporter.sendMail(mailOptions);
    return res.status(200).json({ message: 'Email notification sent successfully' });
  } catch (error) {
    console.error("Error sending email notification:", error);
    return res.status(500).json({ message: 'Failed to send email notification.' });
  }
});

const checklist = TryCatch(async (req, res) => {
  const { email, checklist } = req.body;
  if (!email || !checklist) {
    return res.status(400).json({ message: 'Email and checklist data are required.' });
  }

  const user = await User.findOne({email});
  try {
    let existingChecklist = await Checklist.findOne({ email });

    if (existingChecklist) {
      Object.keys(checklist).forEach((category) => {
        if (existingChecklist.checklist && existingChecklist.checklist[category]) {
          Object.entries(checklist[category]).forEach(([item, value]) => {
            if (value === true && existingChecklist.checklist[category][item] === false) {
              existingChecklist.checklist[category][item] = value;
            }
          });
        }
      });

      existingChecklist.markModified('checklist');
      await existingChecklist.save();

      const allValues = Object.values(existingChecklist.checklist).reduce((acc, category) => {
        return acc.concat(Object.values(category));
      }, []);

      const isChecklistDone = allValues.every((value) => value === true);
      if(isChecklistDone){
        user.isCheckListDone = true;
        await user.save();
      }

      return res.status(200).json({ message: 'Checklist updated successfully.', checklist: existingChecklist });
    } else {
      const newChecklist = new Checklist({
        email,
        checklist,
      });

      await newChecklist.save();
      return res.status(201).json({ message: 'Checklist created successfully.', checklist: newChecklist });
    }
  } catch (error) {
    console.error('Error while saving/updating checklist:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

const getList = TryCatch(async (req, res) => {
  const { email } = req.query;
  
  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  try {
    const existingChecklist = await Checklist.findOne({ email });

    if (!existingChecklist) {
      return res.status(404).json({ message: 'Checklist not found for this email.' });
    }

    const completedItems = [];
    Object.keys(existingChecklist.checklist).forEach((category) => {
      const categoryItems = existingChecklist.checklist[category];
      Object.entries(categoryItems).forEach(([item, value]) => {
        if (value === true) {
          completedItems.push(`${category}: ${item}`);
        }
      });
    });

    // console.log('completedItems items:', completedItems);

    return res.status(200).json({
      message: 'Complete items retrieved successfully.',
      completedItems,
    });

  } catch (error) {
    console.error('Error while retrieving complete checklist:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

const myapplication = TryCatch(async (req, res) => {
  const user = await User.findById(req.user);
  const userEmail = user.email;
  
  let documents = [];

  try {
   if(user.applicationCount > 0 || user.renewalCount > 0){
    const documentsFolder = user.applicationCount > 0 
    ? `user_uploads/${userEmail}/fresh_application` 
    : `user_uploads/${userEmail}/renewal_application`;

    const cloudinaryResult = await cloudinary.api.resources_by_asset_folder(documentsFolder);

     documents = cloudinaryResult.resources.map(resource => ({
      public_id: resource.public_id,
      url: resource.secure_url,
    }));
   }

    res.status(200).json({
      username: user.username,
      email: userEmail,
      applicationStatus: user.status || 'Pending',
      isCheckListDone: user.isCheckListDone,
      documents,
    });
  } catch (error) {
    console.error("Error fetching fresh application documents:", error);
    res.status(500).json({ error: error.message });
  }
});

const deleteFileToCloudinary = TryCatch(async (req, res) => {
  const { public_ids } = req.body;
  // console.log("Public ID:", public_ids);

  if (!public_ids || public_ids.length === 0) {
    return res.status(400).json({ message: 'No public_ids provided' });
  }

  const user = await User.findById(req.user);
  const userEmail = user.email;

  let resourcePaths = [];
  
  if (user.applicationCount > 0) {
    public_ids.forEach(public_id => {
      const DocId = `${public_id}`;
      console.log("DocId:", DocId);
      resourcePaths.push(DocId);
    });
  }

  if (user.renewalCount > 0) {
    public_ids.forEach(public_id => {
      const DocId = `${public_id}`;
      resourcePaths.push(DocId);
    });
  }

  if (resourcePaths.length === 0) {
    return res.status(404).json({ message: 'No files found to delete' });
  }

   try {
   const result = await cloudinary.api.delete_resources(resourcePaths);
   console.log("Result:", result);
    return res.status(200).json({ message: 'Files deleted successfully' , result });
  } catch (error) {
    console.error("Error during file deletion:", error);
    return res.status(500).json({ message: 'Failed to delete some files', error: error.message });
  }

});

export { login, newUser, logout, getDashboard, application, renewal, getAllApplications, getFreshApplications, getRenewalApplications, updateStatus, sendNotification, checklist, getList, myapplication, deleteFileToCloudinary };   
