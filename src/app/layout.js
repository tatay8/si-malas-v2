import './globals.css';

export const metadata = {
  title: 'SI-MaLas - Sistem Informasi Manajemen Kelas',
  description: 'Aplikasi manajemen kelas digital untuk Wali Kelas dan Admin IT Sekolah',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        {/* Background gradient effect */}
        <div className="bg-gradient-wrapper"></div>
        {children}
      </body>
    </html>
  );
}
