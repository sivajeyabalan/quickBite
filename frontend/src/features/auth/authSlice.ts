import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User } from "../../types";
import api from "../../api/axios";

interface AuthState {
    user: User | null;
    accessToken: string | null;
    loading: boolean;
    error: string | null;
}

interface ApiEnvelope<T> {
    data: T;
    message?: string;
    statusCode?: number;
}

interface AuthPayload {
    user: User;
    access_token: string;
}

type AuthResponse = ApiEnvelope<AuthPayload>;
type MeResponse = ApiEnvelope<User> | User;

const isApiEnvelope = <T>(value: unknown): value is ApiEnvelope<T> => {
    return Boolean(value) && typeof value === 'object' && 'data' in (value as object);
};

const initialState: AuthState = {
    user: null ,
    accessToken: null,
    loading : false,
    error : null,
}

export const loginThunk = createAsyncThunk<AuthResponse, { email: string; password: string }, { rejectValue: string }>(
    'auth/login', 
    async (credentials, { rejectWithValue }) => {
        try{
            const res = await api.post<AuthResponse>('/auth/login', credentials);
            return res.data;
        } catch (err: unknown){
            const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            return rejectWithValue(message || 'Login failed');
        }
    }
)

export const registerThunk = createAsyncThunk<AuthResponse, { email: string; password: string; name: string; phone?: string }, { rejectValue: string }>(
    'auth/register',
    async(
        data,
        { rejectWithValue },
    ) => {
        try {
            const res = await api.post<AuthResponse>('/auth/register', data);
            return res.data;
        } catch (err: unknown){
            const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            return rejectWithValue(message || 'Registration failed');
        }
    }
)

export const getMeThunk = createAsyncThunk<MeResponse, void, { rejectValue: string }>(
    'auth/me', async(_, { rejectWithValue }) => {
        try {
            const res = await api.get<MeResponse>('auth/me');
            return res.data;
        } catch (err: unknown){
            const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            return rejectWithValue(message || 'Failed to load user');
        }
    }
)

export const logoutThunk = createAsyncThunk<void, void, { rejectValue: string }>(
    'auth/logout' , async(_, { rejectWithValue }) => {
        try {
            await api.post('auth/logout');
        } catch (err: unknown){
            const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            return rejectWithValue(message || 'Logout failed');
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
            const data = action.payload.data;
            state.accessToken = data.access_token;
            state.user = data.user;
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
                const payload = action.payload;
                state.user = isApiEnvelope<User>(payload) ? payload.data : payload;
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