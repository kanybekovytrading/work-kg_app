export const FormField = ({ label, children, error }: any) => (
	<div className='space-y-2'>
		<label className='text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4'>
			{label}
		</label>
		{children}
		{error && (
			<p className='text-red-500 text-[10px] font-bold uppercase ml-4 mt-1'>
				{error}
			</p>
		)}
	</div>
)
