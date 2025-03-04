import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import * as AdminJSMongoose from '@adminjs/mongoose'
import { dark, light, noSidebar } from '@adminjs/themes'

// Import your models
import { User } from './src/models/user.model.js';


// Register Mongoose adapter
AdminJS.registerAdapter(AdminJSMongoose);

// Configure AdminJS with your models
const adminJs = new AdminJS({
  resources: [
    {
      resource: User,
      options: {
        listProperties: ['username', 'email', 'accountType', 'createdAt', 'verified'],
        properties: {
          password: { isVisible: false },
          refreshToken: { isVisible: false },
          
        },
      },
    },
    
  ],
  defaultTheme: dark.id,
  availableThemes: [dark, light, noSidebar],
  rootPath: '/api/v1/admin',
  branding: {
    companyName: 'JSF AI', // Change the company name here
  
    softwareBrothers: false, // Optional: Hide the AdminJS branding
    withMadeWithLove: false,
   
  },
});

// Build and export the admin router
const adminRouter = AdminJSExpress.buildRouter(adminJs);

export { adminRouter };
