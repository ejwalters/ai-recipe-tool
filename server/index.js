const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const aiRoutes = require('./routes/ai');
app.use('/ai', aiRoutes);

const recipesRoutes = require('./routes/recipes');
app.use('/recipes', recipesRoutes);

const profilesRoutes = require('./routes/profiles');
app.use('/profiles', profilesRoutes);

const socialRoutes = require('./routes/social');
app.use('/social', socialRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
