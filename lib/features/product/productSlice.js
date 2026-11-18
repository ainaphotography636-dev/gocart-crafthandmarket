import { createSlice } from '@reduxjs/toolkit'

const productSlice = createSlice({
    name: 'product',
    initialState: {
        // Start empty — storefront pages hydrate from Supabase.
        // Do not seed GoCart electronics dummy data on the public market.
        list: [],
    },
    reducers: {
        setProduct: (state, action) => {
            state.list = action.payload
        },
        clearProduct: (state) => {
            state.list = []
        }
    }
})

export const { setProduct, clearProduct } = productSlice.actions

export default productSlice.reducer
