import { configureStore, createSlice } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage"; // Utilise localStorage

// Configuration de redux-persist pour le slice "user"
const persistConfig = {
  key: "user",
  storage,
};

// Slice pour l'utilisateur
const userSlice = createSlice({
  name: "user",
  initialState: { 
    id: "", 
    username: "",
    firstName: "", 
    darkMode: false, 
    applications: [],
    has_2fa: false,
    last_activity: null
  },
  reducers: {
    connectUser: (state, action) => {
      state.id = action.payload.id;
      state.username = action.payload.username;
      state.firstName = action.payload.firstName;
      state.darkMode = action.payload.darkMode;
      state.applications = action.payload.applications || [];
      state.has_2fa = action.payload.has_2fa;
      state.last_activity = action.payload.last_activity;
    },
  },
});

// Slice pour le mot de passe oublié (pas besoin de persister ici)
const forgetPasswordSlice = createSlice({
  name: "forgetPassword",
  initialState: { emailUser: "" },
  reducers: {
    forgetPasswordUserEmail: (state, action) => {
      state.emailUser = action.payload.emailUser;
    },
  },
});

// Reducer persistant pour "user"
const persistedUserReducer = persistReducer(persistConfig, userSlice.reducer);

// Configuration du store
export const store = configureStore({
  reducer: {
    user: persistedUserReducer,
    forgetPassword: forgetPasswordSlice.reducer,
  },
});

// Configuration du persistor
export const persistor = persistStore(store);

// Export des actions
export const { connectUser } = userSlice.actions;
export const { forgetPasswordUserEmail } = forgetPasswordSlice.actions;
