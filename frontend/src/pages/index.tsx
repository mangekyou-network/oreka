import type { NextPage } from "next";
import Head from "next/head";
import UpDownContainer from "../views/plays/UpDownContainer";
import Owner from "../components/Owner";

const Home: NextPage = () => {
  return (
    <>
      {/* <UpDownContainer /> */}
      <Owner/>
    </>
  );
};

export default Home;
