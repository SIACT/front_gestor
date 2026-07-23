import clsx from 'clsx';

const LOGO_SRC = {
  altenua:
    'https://res.cloudinary.com/dspprxtpr/image/upload/v1773421727/altenua_hrhiw8.png',
  udenar:
    'https://res.cloudinary.com/dspprxtpr/image/upload/v1774355151/udenarLogoMejorado_batcheditor_fotor_cr0bcw.webp',
};

const LOGO_ALT = {
  altenua: 'Altenua',
  udenar: 'Universidad de Nariño',
};

export function Logo({ variant = 'altenua', className, ...props }) {
  return (
    <img
      src={LOGO_SRC[variant]}
      alt={LOGO_ALT[variant]}
      className={clsx('h-10 w-auto object-contain', className)}
      {...props}
    />
  );
}
