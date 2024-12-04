import type { NextPage } from "next";
import Head from "next/head";
import UpDownContainer from "../views/plays/UpDownContainer";
import Owner from "../components/Owner";
import Customer from "../components/Customer";

const Home: NextPage = () => {
  return (
    <>

      {/* <UpDownContainer /> */}
      <Customer />
    </>
  );
};

export default Home;
