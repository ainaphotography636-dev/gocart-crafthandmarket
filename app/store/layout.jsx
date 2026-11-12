import StoreLayout from "@/components/store/StoreLayout";

export const metadata = {
    title: "Crafthand Market — Store Dashboard",
    description: "Crafthand Market — Vendor / Seller Dashboard",
};

export default function RootAdminLayout({ children }) {

    return (
        <>
            <StoreLayout>
                {children}
            </StoreLayout>
        </>
    );
}
