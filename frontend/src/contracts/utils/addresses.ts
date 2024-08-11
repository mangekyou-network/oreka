import axios from "axios";
import { AGGREGATORS_URL } from "../../configs/constants";

export const getAggregators = async () => {
  try {
    return (await axios.get(AGGREGATORS_URL)).data.result;
  } catch (ex) {
    console.error(ex);
  }
};
