import "@progress/kendo-theme-default/dist/all.css";
import { useState, useEffect } from "react";
import { Grid, GridColumn, GridToolbar } from "@progress/kendo-react-grid";
import { mapTree } from "@progress/kendo-react-treelist";
import { clone } from "@progress/kendo-react-common";
// import { toODataString } from "@progress/kendo-data-query";
import MyCommandCell from "./components/CommandCell";
import Axios from "axios";
import DataContext from "./context/data-context";

function App() {
  const [data, setData] = useState([]);
  const [itemBeforeEdit, setItemBeforeEdit] = useState({});
  const [dataState, setDataState] = useState({ take: 10, skip: 0, group: [] });
  const [total, setTotal] = useState(0);
  /**
   * Request the data when the component mounts and when the dataState changes after a data operation is executed.
   */
  useEffect(() => {
    // console.log(toODataString(dataState));
    console.log(dataState);
    Axios.get("http://localhost:5000/api/products", {
      params: {
        take: dataState.take,
        page: (dataState.skip + dataState.take) / dataState.take,
      },
    }).then((response) => {
      let parsedDataNew = mapTree(response.data.data, "items", (product) => {
        return product;
      });
      setTotal(response.data.total);
      setData([...parsedDataNew]);
    });
  }, [dataState]);

  /**
   * Add a new empty item only to the local data.
   */
  const addRecord = () => {
    let newRecord = {
      ProductID: undefined,
      FirstOrderedOn: null,
      Category: null,
      inEdit: true,
    };
    let newData = [...data];
    newData.unshift(newRecord);
    setData(newData);
  };

  /**
   * Update the local data when the user edits a field.
   */
  const handleItemChange = (event) => {
    let newData = mapTree(data, "items", (item) => {
      if (event.dataItem.ProductID === item.ProductID) {
        item[event.field] = event.value;
      }
      return item;
    });
    setData(newData);
  };

  /**
   * Put the row in edit mode.
   */
  const enterEdit = (dataItem) => {
    let newData = mapTree(data, "items", (item) => {
      dataItem.ProductID === item.ProductID
        ? (item.inEdit = true)
        : (item.inEdit = false);
      return item;
    });

    setItemBeforeEdit(clone(dataItem));
    setData(newData);
  };

  /**
   * Make a request to the server to delete a specific item.
   */
  const remove = (dataItem) => {
    Axios.delete(`http://localhost:4000/delete/${dataItem.ProductID}`, {
      data: { dataState: dataState },
    }).then((response) => {
      let newData = mapTree(response.data.data, "items", (item) => {
        item.FirstOrderedOn = new Date(item.FirstOrderedOn);
        return item;
      });
      setData([...newData]);
      setTotal(response.data.total);
    });
  };

  /**
   * Make a request to the server to create a new item.
   */
  const add = (dataItem) => {
    Axios.post("http://localhost:4000/create", {
      item: dataItem,
      dataState: dataState,
    }).then((response) => {
      let newData = mapTree(response.data.data, "items", (item) => {
        item.FirstOrderedOn = new Date(item.FirstOrderedOn);
        return item;
      });
      setData(newData);
      setTotal(response.data.total);
    });
  };

  /**
   * Remove a new item that has not been still saved on the server.
   */
  const discard = () => {
    let hasGroup = dataState.group.length > 0 ? true : false;
    let newData = [];
    hasGroup
      ? (newData = data.filter((item) => item.value !== undefined))
      : (newData = data.filter((item) => item.ProductID !== undefined));
    setData(newData);
  };

  /**
   * Make a request to the server to update a specific item.
   */
  const update = (dataItem) => {
    Axios.put("http://localhost:4000/update", {
      item: dataItem,
      dataState: dataState,
    }).then((response) => {
      let newData = mapTree(response.data.data, "items", (item) => {
        item.FirstOrderedOn = new Date(item.FirstOrderedOn);
        return item;
      });
      setData(newData);
    });
  };

  /**
   * Cancel the changes made to an item before they were saved on the server.
   */
  const cancel = () => {
    let newData = mapTree(data, "items", (item) => {
      if (item.ProductID === itemBeforeEdit.ProductID) {
        item = itemBeforeEdit;
        item.inEdit = false;
      }
      return item;
    });
    setData(newData);
  };

  /**
   * Update the dataState, this will execute the useEffect and make a request to the server for data operations.
   */
  const handleDataStateChange = (event) => {
    setDataState(event.dataState);
  };

  return (
    <div className="App">
      <DataContext.Provider
        value={{
          enterEdit: enterEdit,
          remove: remove,
          add: add,
          discard: discard,
          update: update,
          cancel: cancel,
        }}
      >
        <Grid
          style={{
            height: "520px",
          }}
          data={data}
          editField="inEdit"
          onItemChange={handleItemChange}
          onDataStateChange={handleDataStateChange}
          {...dataState}
          pageable
          sortable
          filterable
          groupable
          total={total}
        >
          <GridToolbar>
            <div>
              <button
                title="Add new"
                className="k-button k-primary"
                onClick={addRecord}
              >
                Add new
              </button>
            </div>
          </GridToolbar>
          <GridColumn field="ProductName" title="Name" />
          <GridColumn field="description" title="Description" />
          <GridColumn
            field="price"
            title="Price"
            editor="numeric"
            filter="numeric"
          />

          <GridColumn cell={MyCommandCell} width="200px" />
        </Grid>
      </DataContext.Provider>
    </div>
  );
}

export default App;
