import AdminLayout from "@/components/admin/AdminLayout";

export const metadata = {
    title: "Crafthand Market — Admin",
    description: "Crafthand Market — Platform Admin Panel",
};

export default function RootAdminLayout({ children }) {

    return (
        <>
            <AdminLayout>
                {children}
            </AdminLayout>
        </>
    );
}
