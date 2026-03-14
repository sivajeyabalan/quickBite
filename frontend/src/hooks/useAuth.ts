import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { AppDispatch, RootState } from '../app/store';
import {
  loginThunk,
  registerThunk,
  logoutThunk,
} from '../features/auth/authSlice';


export function useAuth() {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const auth = useSelector((s: RootState) => s.auth);

    const login = async (email : string , password : string) => {
        const result = await dispatch(loginThunk({email , password}));

        if( loginThunk.fulfilled.match(result)){
            toast.success('Welcome Back');
            const role = result.payload.data.user.role;

            if ( role == 'ADMIN') navigate('/admin');
            else if ( role === 'STAFF') navigate('/kitchen');
            else navigate('/');
        }
        else {
            toast.error(result.payload as string);
        }
    };

    const register = async (data : {
        email : string;
        password : string ;
        name : string ;
        phone? : string ;
    }) => {
        const result = await dispatch(registerThunk(data));
        if(registerThunk.fulfilled.match(result)) {
            toast.success('Account created! Please log in.');
            navigate('/login');
        } else {
            toast.error(result.payload as string);
        }
    }

    const logout = async () => {
        await dispatch(logoutThunk());
        toast.success('Logged Out')
        navigate('/login');
    }

    return {
        user : auth.user ,
        accessToken : auth.accessToken,
        loading : auth.loading,
        error : auth.error,
        login , register ,logout , 
        isAdmin : auth.user?.role === 'ADMIN',
        isStaff : auth.user?.role == 'STAFF',
        isCustomer : auth.user?.role === 'CUSTOMER',
    }
}