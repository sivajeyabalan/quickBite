

export default function Spinner({size = 'md'} : {size? : 'xs' | 'sm' | 'md'| 'lg'}){
    const sizes = {xs : 'h-3 w-3', sm : 'h-4 w-4', md : 'h-8 w-8' , lg : 'h-12 w-12'};
    return (
        <div className="flex justify-center items-center">
            <div className={`${sizes[size]} animate-spin rounded-full border-4 border-gray-200 border-t-orange-500`} />
        </div>
    )
}