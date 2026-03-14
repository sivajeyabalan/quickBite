import { createAsyncThunk, createSlice, isRejectedWithValue, type PayloadAction } from "@reduxjs/toolkit";
import type { User } from "../../types";
import api from "../../api/axios";

interface AuthState {
    user: User | null;
    accessToken: string | null ;
    loading: boolean;
    error: string | null ;
}

const initialState: AuthState = {
    user: null ,
    accessToken: null,
    loading : false,
    error : null,
}

export const loginThunk = createAsyncThunk(
    'auth/login', 
    async (Credentials : {email : string; password : string} , {rejectWithValue}) => {
        try{
            const res = await api.post('/auth/login' , Credentials);
            return res.data ;
        } catch ( err : any){
            return rejectWithValue(err.response?.data?.message || 'Login failed');
        }
    }
)

export const registerThunk = createAsyncThunk(
    'auth/register',
    async(
        data : {email : string; password : string ; name : string ; phone?: string} ,
        {rejectWithValue},
    ) => {
        try {
            const res = await api.post('/auth/register' , data);
            return res.data;
        } catch (err : any){
            return rejectWithValue(err.response?.data?.message || 'Registration failed')
        }
    }
)

export const getMeThunk = createAsyncThunk(
    'auth/me', async(_, {rejectWithValue}) => {
        try {
            const res = await api.get('auth/me')
            return res.data ;
        } catch (err : any){
            return rejectWithValue(err.response?.data?.message)
        }
    }
)

export const logoutThunk = createAsyncThunk(
    'auth/logout' , async(_, {rejectWithValue}) => {
        try {
            await api.post('auth/logout');
        } catch (err : any){
            return rejectWithValue(err.response?.data?.message);
        }
    }
)



const authSlice = createSlice({
    name : 'auth',
    initialState , 
    reducers : {
        setAccessToken(state , action : PayloadAction<string>){
            state.accessToken = action.payload;
        },
        clearAuth(state) {
            state.user = null ;
            state.accessToken = null ;
            state.error  = null ;
        }
    },
    extraReducers: (builder) => {
        builder.addCase(loginThunk.pending , (state) => {
            state.loading = true ;
            state.error = null ;
        })
        .addCase(loginThunk.fulfilled , (state , action) => {
            state.loading = false ;
            state.accessToken = action.payload.data.access_token;
            state.user = action.payload.data.user ;
        })
        .addCase(loginThunk.rejected, (state , action) => {
            state.loading = false ;
            state.error = action.payload as string ;
        })


        builder
      .addCase(registerThunk.pending, (state) => { state.loading = true; })
      .addCase(registerThunk.fulfilled, (state) => { state.loading = false; })
      .addCase(registerThunk.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload as string;
      });

      builder
      .addCase(getMeThunk.fulfilled, (state, action) => {
        state.user = action.payload.data;
      });

          builder
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user        = null;
        state.accessToken = null;
      });

    }
})

export const { setAccessToken, clearAuth } = authSlice.actions;
export default authSlice.reducer;